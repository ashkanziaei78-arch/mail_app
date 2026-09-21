import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requirePage } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { contactScope } from "@/lib/scope";
import CampaignWizard from "./campaign-wizard";

export const metadata: Metadata = { title: "کمپین" };
export const dynamic = "force-dynamic";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePage("campaigns.read");
  const { id } = await params;

  const campaign = await prisma.campaign.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      letters: {
        orderBy: { createdAt: "asc" },
        take: 1,
        include: { letterhead: { include: { fields: { orderBy: { sortOrder: "asc" } } } } },
      },
      workflow: { include: { steps: { include: { position: true }, orderBy: { order: "asc" } } } },
      approvals: { include: { position: true, approver: { select: { fullName: true } } }, orderBy: { order: "asc" } },
      approvedBy: { select: { fullName: true } },
      recipients: {
        include: {
          contact: { include: { organizations: { where: { isPrimary: true }, take: 1 } } },
          document: { include: { shortLink: true } },
          smsMessage: true,
          response: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!campaign) notFound();

  const [contacts, groups, tags, letterheads] = await Promise.all([
    prisma.contact.findMany({
      where: { AND: [contactScope(user), { status: "ACTIVE" }] },
      include: { organizations: { where: { isPrimary: true }, take: 1 } },
      orderBy: [{ lastName: "asc" }],
      take: 1000,
    }),
    prisma.group.findMany({
      where: { organizationId: user.organizationId, deletedAt: null },
      include: { _count: { select: { members: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.tag.findMany({
      where: { organizationId: user.organizationId, deletedAt: null },
      include: { _count: { select: { contacts: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.letterhead.findMany({
      where: { organizationId: user.organizationId, status: "ACTIVE" },
      include: { fields: { orderBy: { sortOrder: "asc" } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const currentUserPosition = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { positionId: true },
  });

  const letter = campaign.letters[0];

  return (
    <CampaignWizard
      organizationName={user.organizationName}
      campaign={{
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        status: campaign.status,
        confidentiality: campaign.confidentiality,
        smsBodyText: campaign.smsBodyText,
        rejectionReason: campaign.rejectionReason,
        approvedBy: campaign.approvedBy?.fullName ?? null,
        workflowName: campaign.workflow?.name ?? null,
        approvals: campaign.approvals.map((a) => ({
          id: a.id,
          order: a.order,
          status: a.status,
          positionId: a.positionId,
          positionName: a.position.name,
          approverName: a.approver?.fullName ?? null,
          note: a.note,
          decidedAt: a.decidedAt?.toISOString() ?? null,
        })),
      }}
      letter={{
        title: letter?.title ?? "",
        letterNumber: letter?.letterNumber ?? "",
        subject: letter?.subject ?? "",
        bodyHtml: letter?.bodyHtml ?? "",
        senderName: letter?.senderName ?? "",
        letterheadId: letter?.letterheadId ?? "",
        letterheadUrl: letter?.letterhead?.fileUrl ?? null,
        fieldValues: (letter?.fieldValuesJson as Record<string, string> | null) ?? {},
      }}
      recipients={campaign.recipients.map((r) => ({
        id: r.id,
        contactId: r.contact.id,
        name: `${r.contact.firstName} ${r.contact.lastName}`,
        formalTitle: r.contact.formalTitle ?? "",
        mobilePhone: r.contact.mobilePhone ?? "",
        jobTitle: r.contact.organizations[0]?.jobTitle ?? "",
        contactOrganization: r.contact.organizations[0]?.organizationName ?? "",
        city: r.contact.city ?? "",
        status: r.status,
        errorMessage: r.errorMessage,
        overrideHtml: r.letterOverrideHtml,
        shortCode: r.document?.shortLink?.code ?? null,
        accessCode: r.document?.shortLink?.accessCode ?? null,
        smsText: r.smsMessage?.finalText ?? null,
        smsStatus: r.smsMessage?.status ?? null,
        sentAt: r.sentAt?.toISOString() ?? null,
        deliveredAt: r.deliveredAt?.toISOString() ?? null,
        firstViewedAt: r.firstViewedAt?.toISOString() ?? null,
        lastViewedAt: r.lastViewedAt?.toISOString() ?? null,
        viewCount: r.viewCount,
        respondedAt: r.respondedAt?.toISOString() ?? null,
        responseKind: r.response?.kind ?? null,
        responseMessage: r.response?.message ?? null,
      }))}
      options={{
        contacts: contacts.map((c) => ({
          id: c.id,
          name: `${c.firstName} ${c.lastName}`,
          organizationName: c.organizations[0]?.organizationName ?? "",
          mobilePhone: c.mobilePhone ?? "",
        })),
        groups: groups.map((g) => ({ id: g.id, name: g.name, count: g._count.members })),
        tags: tags.map((t) => ({ id: t.id, name: t.name, count: t._count.contacts })),
        letterheads: letterheads.map((l) => ({
          id: l.id,
          name: l.name,
          fileUrl: l.fileUrl,
          fields: l.fields.map((f) => ({
            id: f.id, key: f.key, label: f.label, type: f.type, area: f.area,
            placeholder: f.placeholder, helpText: f.helpText, required: f.required,
            defaultValue: f.defaultValue, options: (f.optionsJson as string[] | null) ?? [],
          })),
        })),
      }}
      permissions={{
        write: can(user.role, "campaigns.write"),
        approve: can(user.role, "campaigns.approve"),
        send: can(user.role, "campaigns.send"),
        positionId: currentUserPosition.positionId,
        isOrgAdmin: user.role === "ORG_ADMIN" || user.role === "SUPER_ADMIN",
      }}
    />
  );
}
