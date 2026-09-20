import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, readBody, requireApi, ApiError } from "@/lib/api";
import { encrypt } from "@/lib/crypto";
import { countSegments, normalizeMobile, SUPPORTED_PROVIDERS } from "@/lib/sms";
import { resolveProvider } from "@/lib/sms-server";
import { audit } from "@/lib/audit";

const schema = z.object({
  providerName: z.enum(["console", "kavenegar"]),
  apiKey: z.string().trim().default(""),
  senderNumber: z.string().trim().min(1, "شماره فرستنده الزامی است."),
});

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApi("sms.settings");
    const input = await readBody(request, schema);
    if (input.providerName !== "console" && !input.apiKey) {
      throw new ApiError(422, "کلید API درگاه را وارد کنید.");
    }
    if (!SUPPORTED_PROVIDERS.some((p) => p.value === input.providerName)) {
      throw new ApiError(422, "درگاه پشتیبانی نمی‌شود.");
    }

    const existing = await prisma.smsProviderConfig.findFirst({
      where: { organizationId: user.organizationId, isDefault: true },
    });

    // کلید خالی هنگام ویرایش ⇒ کلید قبلی حفظ می‌شود (در فرم هرگز نمایش داده نمی‌شود)
    const apiKeyEncrypted = input.apiKey ? encrypt(input.apiKey) : existing?.apiKeyEncrypted ?? encrypt("");

    const data = { providerName: input.providerName, senderNumber: input.senderNumber, apiKeyEncrypted, isDefault: true };
    const config = existing
      ? await prisma.smsProviderConfig.update({ where: { id: existing.id }, data })
      : await prisma.smsProviderConfig.create({ data: { ...data, organizationId: user.organizationId } });

    await audit({ organizationId: user.organizationId, userId: user.id, action: "SMS_SETTINGS_UPDATE", entityType: "SmsProviderConfig", entityId: config.id, metadata: { providerName: input.providerName } });
    return { id: config.id, providerName: config.providerName };
  });
}

/** ارسال آزمایشی به یک شماره — برای بررسی صحت تنظیمات درگاه. */
export async function PUT(request: Request) {
  return handle(async () => {
    const user = await requireApi("sms.settings");
    const { phone, text } = await readBody(request, z.object({
      phone: z.string().trim(),
      text: z.string().trim().min(1).max(500),
    }));

    const mobile = normalizeMobile(phone);
    if (!mobile) throw new ApiError(422, "شماره همراه معتبر نیست.");

    const config = await prisma.smsProviderConfig.findFirst({ where: { organizationId: user.organizationId, isDefault: true } });
    const provider = resolveProvider(config);
    const result = await provider.send(mobile, text, config?.senderNumber ?? "10008663");

    await audit({ organizationId: user.organizationId, userId: user.id, action: "SMS_TEST", entityType: "SmsProviderConfig", metadata: { mobile, ok: result.ok } });
    if (!result.ok) throw new ApiError(502, `ارسال آزمایشی ناموفق بود: ${result.error}`);
    return { providerMessageId: result.providerMessageId, segments: countSegments(text).segments };
  });
}
