import crypto from "node:crypto";
import { prisma } from "./db";
import { randomCode, randomDigits, sign } from "./crypto";
import { applyVariables, buildContext, sanitizeHtml, withLetterheadFields } from "./render";
import { countSegments, normalizeMobile } from "./sms";
import { resolveProvider } from "./sms-server";
import type { CurrentUser } from "./auth";
import { contactScope } from "./scope";
import { audit } from "./audit";

export type RecipientSelection = {
  contactIds?: string[];
  groupIds?: string[];
  tagIds?: string[];
  tagMode?: "AND" | "OR";
};

/** انتخاب مخاطبین: فردی + گروهی + برچسبی (AND/OR) — اجتماع نتایج، بدون تکرار. */
export async function resolveRecipients(user: CurrentUser, selection: RecipientSelection): Promise<string[]> {
  const scope = contactScope(user);
  const ids = new Set<string>();

  if (selection.contactIds?.length) {
    const rows = await prisma.contact.findMany({
      where: { AND: [scope, { id: { in: selection.contactIds } }] },
      select: { id: true },
    });
    rows.forEach((r) => ids.add(r.id));
  }

  if (selection.groupIds?.length) {
    const rows = await prisma.contact.findMany({
      where: { AND: [scope, { groupMembers: { some: { groupId: { in: selection.groupIds } } } }] },
      select: { id: true },
    });
    rows.forEach((r) => ids.add(r.id));
  }

  if (selection.tagIds?.length) {
    const tagFilter =
      selection.tagMode === "AND"
        ? { AND: selection.tagIds.map((tagId) => ({ tags: { some: { tagId } } })) }
        : { tags: { some: { tagId: { in: selection.tagIds } } } };
    const rows = await prisma.contact.findMany({
      where: { AND: [scope, tagFilter] },
      select: { id: true },
    });
    rows.forEach((r) => ids.add(r.id));
  }

  return [...ids];
}

function documentNumber(campaignSeq: number, index: number): string {
  const year = new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-latn", { year: "numeric" }).format(new Date());
  return `MS-${year}-${String(campaignSeq).padStart(4, "0")}-${String(index).padStart(4, "0")}`;
}

/**
 * تولید سند اختصاصی + لینک کوتاه برای هر مخاطب کمپین.
 * ایدمپوتنت: کلید یکتایی = هش (campaignId, contactId, متن نهایی) ⇒ اجرای مجدد سند تکراری نمی‌سازد.
 */
export async function generateDocuments(campaignId: string) {
  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: {
      organization: { select: { name: true } },
      letters: {
        orderBy: { createdAt: "asc" },
        take: 1,
        include: { letterhead: { include: { fields: true } } },
      },
      recipients: {
        include: {
          contact: { include: { organizations: { where: { isPrimary: true }, take: 1 } } },
          document: true,
        },
      },
    },
  });

  const letter = campaign.letters[0];
  if (!letter) throw new Error("برای این کمپین متن نامه ثبت نشده است.");

  let created = 0;
  let skipped = 0;
  let index = 0;

  for (const recipient of campaign.recipients) {
    index++;
    const contact = recipient.contact;
    const mobile = normalizeMobile(contact.mobilePhone);
    if (!mobile || !contact.smsConsent) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "SKIPPED",
          errorMessage: !mobile ? "شماره همراه معتبر ندارد." : "رضایت دریافت پیامک ثبت نشده است.",
        },
      });
      skipped++;
      continue;
    }

    const primary = contact.organizations[0];
    const baseContext = buildContext({
      formalTitle: contact.formalTitle,
      firstName: contact.firstName,
      lastName: contact.lastName,
      jobTitle: primary?.jobTitle,
      contactOrganization: primary?.organizationName,
      city: contact.city,
      mobilePhone: mobile,
      senderOrganization: campaign.organization.name,
      letterDate: letter.letterDate,
      letterNumber: letter.letterNumber,
    });
    const context = withLetterheadFields(
      baseContext,
      letter.letterhead?.fields ?? [],
      letter.fieldValuesJson as Record<string, string> | null,
    );

    const source = recipient.letterOverrideHtml ?? letter.bodyHtml;
    const renderedHtml = sanitizeHtml(applyVariables(source, context));
    const fileHash = crypto
      .createHash("sha256")
      .update(`${campaign.id}:${contact.id}:${letter.version}:${renderedHtml}`)
      .digest("hex");

    if (recipient.document?.fileHash === fileHash) {
      skipped++;
      continue;
    }

    if (recipient.document) {
      // نامه تغییر کرده ⇒ نسخه جدید سند، لینک کوتاه قبلی حفظ می‌شود
      await prisma.generatedDocument.update({
        where: { id: recipient.document.id },
        data: {
          renderedHtml,
          fileHash,
          version: { increment: 1 },
          contentSignature: sign(`${recipient.document.documentNumber}:${fileHash}`, "link-hmac"),
          signedAt: new Date(),
        },
      });
    } else {
      const number = documentNumber(campaign.createdAt.getTime() % 10000, index);
      const document = await prisma.generatedDocument.create({
        data: {
          campaignRecipientId: recipient.id,
          letterId: letter.id,
          renderedHtml,
          fileHash,
          documentNumber: number,
          // امضای HMAC روی محتوای نهایی: هر تغییر بعدی در متن، امضا را باطل می‌کند
          contentSignature: sign(`${number}:${fileHash}`, "link-hmac"),
          signedAt: new Date(),
        },
      });
      await prisma.shortLink.create({
        data: {
          documentId: document.id,
          code: randomCode(10),
          accessCode: campaign.confidentiality === "CONFIDENTIAL" ? randomDigits(6) : null,
          expiresAt: null,
        },
      });
    }

    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: { status: "DOCUMENT_GENERATED", errorMessage: null },
    });
    created++;
  }

  return { created, skipped, total: campaign.recipients.length };
}

/**
 * ارسال پیامک کمپین.
 * ponytail: حلقه ترتیبی داخل همین درخواست به‌جای BullMQ/Redis — برای چند صد مخاطب کافی است.
 * سقف: کمپین چندهزارنفره از timeout رد می‌شود؛ آن‌وقت این تابع را داخل worker صف ببرید.
 */
export async function sendCampaign(campaignId: string, user: CurrentUser) {
  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: {
      organization: { select: { name: true } },
      letters: { orderBy: { createdAt: "asc" }, take: 1 },
      recipients: {
        where: { status: { in: ["DOCUMENT_GENERATED", "SMS_QUEUED", "SMS_FAILED"] } },
        include: {
          contact: { include: { organizations: { where: { isPrimary: true }, take: 1 } } },
          document: { include: { shortLink: true } },
          smsMessage: true,
        },
      },
    },
  });

  if (campaign.status !== "APPROVED" && campaign.status !== "PROCESSING") {
    throw new Error("کمپین باید ابتدا تأیید شود.");
  }

  const config = await prisma.smsProviderConfig.findFirst({
    where: { organizationId: campaign.organizationId, isDefault: true },
  });
  const provider = resolveProvider(config);
  const sender = config?.senderNumber ?? "10008663";
  const baseUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const smsBody =
    campaign.smsBodyText ??
    "{{عنوان}} {{نام_کامل}} گرامی، نامه‌ای از {{سازمان_فرستنده}} برای شما صادر شد: {{لینک}}\nلغو: {{لغو_اشتراک}}";

  await prisma.campaign.update({ where: { id: campaign.id }, data: { status: "PROCESSING" } });

  let sent = 0;
  let failed = 0;

  for (const recipient of campaign.recipients) {
    const link = recipient.document?.shortLink;
    const mobile = normalizeMobile(recipient.contact.mobilePhone);

    // مخاطبی که لغو اشتراک کرده، هرگز پیامک نمی‌گیرد — حتی اگر در فهرست کمپین باشد
    if (!recipient.contact.smsConsent) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "SKIPPED", errorMessage: "مخاطب دریافت پیامک را لغو کرده است." },
      });
      continue;
    }

    if (!link || !mobile) {
      failed++;
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "SMS_FAILED", errorMessage: "سند یا شماره همراه در دسترس نیست." },
      });
      continue;
    }

    const primary = recipient.contact.organizations[0];
    const context = buildContext({
      formalTitle: recipient.contact.formalTitle,
      firstName: recipient.contact.firstName,
      lastName: recipient.contact.lastName,
      jobTitle: primary?.jobTitle,
      contactOrganization: primary?.organizationName,
      city: recipient.contact.city,
      mobilePhone: mobile,
      senderOrganization: campaign.organization.name,
      letterDate: campaign.letters[0]?.letterDate,
      letterNumber: campaign.letters[0]?.letterNumber,
      shortLink: `${baseUrl}/l/${link.code}`,
      accessCode: link.accessCode ?? "",
    });

    // توکن لغو اشتراک یک بار ساخته و برای همیشه نگه داشته می‌شود
    let unsubscribeToken = recipient.contact.unsubscribeToken;
    if (!unsubscribeToken) {
      unsubscribeToken = randomCode(14);
      await prisma.contact.update({ where: { id: recipient.contact.id }, data: { unsubscribeToken } });
    }
    context["{{لغو_اشتراک}}"] = `${baseUrl}/u/${unsubscribeToken}`;

    const finalText = applyVariables(smsBody, context);

    const smsMessage = await prisma.smsMessage.upsert({
      where: { campaignRecipientId: recipient.id },
      create: {
        campaignRecipientId: recipient.id,
        contactId: recipient.contact.id,
        toPhone: mobile,
        finalText,
        segmentsCount: countSegments(finalText).segments,
        status: "QUEUED",
      },
      update: {
        finalText,
        toPhone: mobile,
        segmentsCount: countSegments(finalText).segments,
        status: "QUEUED",
        retryCount: { increment: recipient.smsMessage ? 1 : 0 },
      },
    });

    const result = await provider.send(mobile, finalText, sender);
    if (result.ok) {
      sent++;
      await prisma.smsMessage.update({
        where: { id: smsMessage.id },
        data: { status: "SENT", providerMessageId: result.providerMessageId, sentAt: new Date(), errorMessage: null },
      });
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "SMS_SENT", errorMessage: null, sentAt: new Date() },
      });
      await prisma.contact.update({ where: { id: recipient.contact.id }, data: { lastUsedInCampaignAt: new Date() } });

      // نامه محرمانه: کد دسترسی در پیامک دوم و جداگانه ارسال می‌شود
      if (link.accessCode) {
        await provider.send(mobile, `کد دسترسی نامه محرمانه شما: ${link.accessCode}`, sender);
      }
    } else {
      failed++;
      await prisma.smsMessage.update({
        where: { id: smsMessage.id },
        data: { status: "FAILED", errorMessage: result.error },
      });
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "SMS_FAILED", errorMessage: result.error },
      });
    }
  }

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: failed > 0 && sent === 0 ? "FAILED" : "COMPLETED" },
  });

  await audit({
    organizationId: campaign.organizationId,
    userId: user.id,
    action: "CAMPAIGN_SEND",
    entityType: "Campaign",
    entityId: campaign.id,
    metadata: { sent, failed },
  });

  return { sent, failed };
}
