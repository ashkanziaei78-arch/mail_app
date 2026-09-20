import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, readBody, requireApi } from "@/lib/api";
import { audit } from "@/lib/audit";

const schema = z.object({
  name: z.string().trim().min(1, "نام کمپین الزامی است.").max(120),
  subject: z.string().trim().max(200).optional().nullable(),
  confidentiality: z.enum(["NORMAL", "CONFIDENTIAL"]).default("NORMAL"),
  letterheadId: z.string().uuid().optional().nullable(),
  letterTemplateId: z.string().uuid().optional().nullable(),
  letterTitle: z.string().trim().max(200).optional().nullable(),
  letterNumber: z.string().trim().max(60).optional().nullable(),
});

export async function GET() {
  return handle(async () => {
    const user = await requireApi("campaigns.read");
    return prisma.campaign.findMany({
      where: { organizationId: user.organizationId },
      include: { department: true, _count: { select: { recipients: true } } },
      orderBy: { createdAt: "desc" },
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApi("campaigns.write");
    const input = await readBody(request, schema);

    const template = input.letterTemplateId
      ? await prisma.letterTemplate.findFirst({ where: { id: input.letterTemplateId, organizationId: user.organizationId } })
      : null;

    const campaign = await prisma.campaign.create({
      data: {
        organizationId: user.organizationId,
        departmentId: user.departmentId,
        createdByUserId: user.id,
        name: input.name,
        subject: input.subject || null,
        confidentiality: input.confidentiality,
        letters: {
          create: {
            organizationId: user.organizationId,
            letterheadId: input.letterheadId || null,
            letterTemplateId: template?.id ?? null,
            title: input.letterTitle || input.name,
            letterNumber: input.letterNumber || null,
            letterDate: new Date(),
            subject: input.subject || null,
            bodyHtml: template?.bodyHtml ?? "<p>{{عنوان}} {{نام_کامل}} گرامی</p>\n<p>با سلام و احترام،</p>",
          },
        },
      },
    });

    await audit({ organizationId: user.organizationId, userId: user.id, action: "CAMPAIGN_CREATE", entityType: "Campaign", entityId: campaign.id });
    return campaign;
  });
}
