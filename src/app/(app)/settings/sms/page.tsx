import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requirePage } from "@/lib/auth";
import SmsSettingsClient from "./sms-settings-client";

export const metadata: Metadata = { title: "تنظیمات پیامک" };
export const dynamic = "force-dynamic";

export default async function SmsSettingsPage() {
  const user = await requirePage("sms.settings");
  const config = await prisma.smsProviderConfig.findFirst({
    where: { organizationId: user.organizationId, isDefault: true },
  });
  // کلید API هرگز به کلاینت فرستاده نمی‌شود؛ فقط «تنظیم‌شده / نشده» را می‌فرستیم.
  return (
    <SmsSettingsClient
      current={config ? { providerName: config.providerName, senderNumber: config.senderNumber, hasKey: config.apiKeyEncrypted.length > 40 } : null}
    />
  );
}
