import "server-only";
import { decrypt } from "./crypto";
import { consoleProvider, kavenegarProvider, type SmsProvider } from "./sms";

/** انتخاب درگاه از روی تنظیمات سازمان. کلید API فقط همین‌جا رمزگشایی می‌شود. */
export function resolveProvider(config: { providerName: string; apiKeyEncrypted: string } | null): SmsProvider {
  if (!config || config.providerName === "console") return consoleProvider;
  if (config.providerName === "kavenegar") return kavenegarProvider(decrypt(config.apiKeyEncrypted));
  throw new Error(`درگاه پیامک پشتیبانی نمی‌شود: ${config.providerName}`);
}
