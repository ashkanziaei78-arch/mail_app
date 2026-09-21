import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, readBody, requireApi, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";

const schema = z.object({
  name: z.string().trim().min(1, "نام گردش کار الزامی است.").max(80),
  isDefault: z.boolean().default(false),
  steps: z.array(z.object({
    positionId: z.string().uuid(),
    label: z.string().trim().max(80).optional().nullable(),
    optional: z.boolean().default(false),
  })).min(1, "حداقل یک مرحله لازم است.").max(10),
});

export async function GET() {
  return handle(async () => {
    const user = await requireApi("campaigns.read");
    return prisma.workflow.findMany({
      where: { organizationId: user.organizationId },
      include: { steps: { include: { position: true }, orderBy: { order: "asc" } } },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApi("users.manage");
    const input = await readBody(request, schema);

    if (await prisma.workflow.findFirst({ where: { organizationId: user.organizationId, name: input.name } })) {
      throw new ApiError(409, `گردش کاری با نام «${input.name}» وجود دارد.`);
    }
    const positions = await prisma.position.findMany({
      where: { organizationId: user.organizationId, id: { in: input.steps.map((s) => s.positionId) } },
    });
    if (positions.length !== new Set(input.steps.map((s) => s.positionId)).size) {
      throw new ApiError(422, "یکی از سمت‌های انتخاب‌شده معتبر نیست.");
    }

    if (input.isDefault) {
      await prisma.workflow.updateMany({ where: { organizationId: user.organizationId }, data: { isDefault: false } });
    }

    const workflow = await prisma.workflow.create({
      data: {
        organizationId: user.organizationId,
        name: input.name,
        isDefault: input.isDefault,
        steps: {
          create: input.steps.map((step, index) => ({
            positionId: step.positionId,
            order: index + 1,
            label: step.label || null,
            optional: step.optional,
          })),
        },
      },
    });
    await audit({ organizationId: user.organizationId, userId: user.id, action: "WORKFLOW_CREATE", entityType: "Workflow", entityId: workflow.id });
    return workflow;
  });
}
