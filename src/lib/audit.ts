import { headers } from "next/headers";
import { prisma } from "./db";

export async function audit(params: {
  organizationId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: unknown;
}) {
  let ipAddress: string | null = null;
  try {
    const h = await headers();
    ipAddress = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  } catch {
    // خارج از چرخه درخواست (مثلاً seed) — IP نداریم
  }
  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId ?? null,
      userId: params.userId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      metadataJson: (params.metadata ?? {}) as object,
      ipAddress,
    },
  });
}
