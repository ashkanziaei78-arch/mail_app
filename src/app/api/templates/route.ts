import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, readBody, requireApi } from "@/lib/api";
import { sanitizeHtml } from "@/lib/render";
import { audit } from "@/lib/audit";

const schema = z.object({
  name: z.string().trim().min(1, "نام قالب الزامی است.").max(80),
  bodyHtml: z.string().trim().min(1, "متن قالب خالی است."),
});

export async function GET() {
  return handle(async () => {
    const user = await requireApi("campaigns.read");
    return prisma.letterTemplate.findMany({
      where: { organizationId: user.organizationId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApi("templates.write");
    const input = await readBody(request, schema);
    const template = await prisma.letterTemplate.create({
      data: {
        organizationId: user.organizationId,
        name: input.name,
        bodyHtml: sanitizeHtml(input.bodyHtml),
      },
    });
    await audit({ organizationId: user.organizationId, userId: user.id, action: "TEMPLATE_CREATE", entityType: "LetterTemplate", entityId: template.id });
    return template;
  });
}
