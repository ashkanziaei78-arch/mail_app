import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, readBody, requireApi, ApiError } from "@/lib/api";

const schema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApi("letterheads.write");
    const { id } = await params;
    const input = await readBody(request, schema);
    const letterhead = await prisma.letterhead.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!letterhead) throw new ApiError(404, "سربرگ یافت نشد.");

    if (input.isDefault) {
      await prisma.letterhead.updateMany({ where: { organizationId: user.organizationId }, data: { isDefault: false } });
    }
    return prisma.letterhead.update({ where: { id }, data: { status: input.status, isDefault: input.isDefault } });
  });
}
