import { prisma } from "@/lib/db";
import { requireApi } from "@/lib/api";
import { toCsv } from "@/lib/csv";
import { faDateTime } from "@/lib/jalali";
import { SMS_STATUS } from "@/lib/labels";

const COLUMNS = ["کمپین", "مخاطب", "شماره", "وضعیت", "تعداد بخش", "زمان ارسال", "خطا", "متن پیامک"];

export async function GET(request: Request) {
  const user = await requireApi("reports.read");
  const params = new URL(request.url).searchParams;
  const from = params.get("from") ? new Date(params.get("from")!) : undefined;
  const to = params.get("to") ? new Date(`${params.get("to")}T23:59:59`) : undefined;
  const status = params.get("status");

  const messages = await prisma.smsMessage.findMany({
    where: {
      campaignRecipient: { campaign: { organizationId: user.organizationId } },
      ...(status && status in SMS_STATUS ? { status: status as keyof typeof SMS_STATUS } : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    },
    include: { campaignRecipient: { include: { campaign: { select: { name: true } }, contact: { select: { firstName: true, lastName: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(
    messages.map((m) => ({
      "کمپین": m.campaignRecipient.campaign.name,
      "مخاطب": `${m.campaignRecipient.contact.firstName} ${m.campaignRecipient.contact.lastName}`,
      "شماره": m.toPhone,
      "وضعیت": SMS_STATUS[m.status].label,
      "تعداد بخش": m.segmentsCount,
      "زمان ارسال": faDateTime(m.sentAt ?? m.createdAt),
      "خطا": m.errorMessage ?? "",
      "متن پیامک": m.finalText,
    })),
    COLUMNS,
  );

  return new Response(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="sms-report-${Date.now()}.csv"` },
  });
}
