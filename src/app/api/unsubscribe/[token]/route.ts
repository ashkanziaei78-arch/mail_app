import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, readBody, ApiError } from "@/lib/api";
import { clientIp, consume, RULES } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  return handle(async () => {
    const { token } = await params;
    await consume(`unsubscribe:${await clientIp()}`, RULES.accessCode);

    const { consent } = await readBody(request, z.object({ consent: z.boolean() }));
    const contact = await prisma.contact.findUnique({ where: { unsubscribeToken: token } });
    if (!contact || contact.deletedAt) throw new ApiError(404, "این لینک معتبر نیست.");

    await prisma.contact.update({
      where: { id: contact.id },
      data: { smsConsent: consent, unsubscribedAt: consent ? null : new Date() },
    });
    await audit({
      organizationId: contact.organizationId,
      action: consent ? "SMS_RESUBSCRIBE" : "SMS_UNSUBSCRIBE",
      entityType: "Contact", entityId: contact.id,
    });
    return { consent };
  });
}
