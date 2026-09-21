import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, readBody, requireApi, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";

const schema = z.object({
  name: z.string().trim().min(1, "نام سمت الزامی است.").max(80),
  rank: z.number().int().min(1).max(999).default(100),
  canApprove: z.boolean().default(false),
  canSign: z.boolean().default(false),
});

export async function GET() {
  return handle(async () => {
    const user = await requireApi("campaigns.read");
    return prisma.position.findMany({
      where: { organizationId: user.organizationId },
      include: { _count: { select: { users: true } } },
      orderBy: { rank: "asc" },
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApi("users.manage");
    const input = await readBody(request, schema);
    if (await prisma.position.findFirst({ where: { organizationId: user.organizationId, name: input.name } })) {
      throw new ApiError(409, `سمتی با نام «${input.name}» وجود دارد.`);
    }
    const position = await prisma.position.create({ data: { ...input, organizationId: user.organizationId } });
    await audit({ organizationId: user.organizationId, userId: user.id, action: "POSITION_CREATE", entityType: "Position", entityId: position.id });
    return position;
  });
}
