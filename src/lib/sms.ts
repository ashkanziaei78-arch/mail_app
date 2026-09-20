export type SmsSendResult = { ok: true; providerMessageId: string } | { ok: false; error: string };

export type SmsProvider = {
  name: string;
  send(to: string, text: string, sender: string): Promise<SmsSendResult>;
};

/** درگاه آزمایشی — پیامک را فقط در لاگ سرور چاپ می‌کند (محیط توسعه). */
export const consoleProvider: SmsProvider = {
  name: "console",
  async send(to, text) {
    console.info(`[SMS:console] → ${to}\n${text}\n`);
    return { ok: true, providerMessageId: `console-${Date.now()}` };
  },
};

/** کاوه‌نگار — REST ساده. کلید از تنظیمات سازمان (رمزنگاری‌شده) خوانده می‌شود. */
export function kavenegarProvider(apiKey: string): SmsProvider {
  return {
    name: "kavenegar",
    async send(to, text, sender) {
      const url = `https://api.kavenegar.com/v1/${encodeURIComponent(apiKey)}/sms/send.json`;
      const body = new URLSearchParams({ receptor: to, message: text, sender });
      try {
        const res = await fetch(url, { method: "POST", body, cache: "no-store" });
        const json = (await res.json()) as {
          return?: { status: number; message: string };
          entries?: Array<{ messageid: number }>;
        };
        if (json.return?.status !== 200) {
          return { ok: false, error: json.return?.message ?? `خطای درگاه (${res.status})` };
        }
        return { ok: true, providerMessageId: String(json.entries?.[0]?.messageid ?? "") };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "خطای شبکه" };
      }
    },
  };
}

export const SUPPORTED_PROVIDERS = [
  { value: "console", label: "آزمایشی (چاپ در لاگ سرور)" },
  { value: "kavenegar", label: "کاوه‌نگار" },
];

/** شمارش بخش‌های پیامک؛ متن فارسی یونیکد است: ۷۰ کاراکتر تک‌بخشی، ۶۷ در چندبخشی. */
export function countSegments(text: string): { unicode: boolean; length: number; segments: number } {
  const unicode = /[^\u0000-\u007F]/.test(text);
  const length = [...text].length;
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  const segments = length === 0 ? 0 : length <= single ? 1 : Math.ceil(length / multi);
  return { unicode, length, segments };
}

/** نرمال‌سازی شماره همراه ایران به فرم 09xxxxxxxxx */
export function normalizeMobile(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\D/g, "");
  let n = digits;
  if (n.startsWith("0098")) n = n.slice(4);
  else if (n.startsWith("98") && n.length === 12) n = n.slice(2);
  if (n.length === 10 && n.startsWith("9")) n = "0" + n;
  return /^09\d{9}$/.test(n) ? n : null;
}
