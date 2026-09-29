export type SmsSendResult = { ok: true; providerMessageId: string } | { ok: false; error: string };

export type SmsProvider = {
  name: string;
  send(to: string, text: string, sender: string): Promise<SmsSendResult>;
  /**
   * ارسال گروهی با متن متفاوت برای هر شماره.
   *
   * هر نامه متن شخصی خودش را دارد، پس «ارسال گروهی» معمولی به‌درد نمی‌خورد و
   * باید نظیربه‌نظیر فرستاد. بدون این، یک کمپین صد نفره صد درخواست HTTP پشت‌سرهم
   * می‌شود و از مهلت اجرای تابع سرور می‌زند بیرون.
   * نتیجه هم‌ترتیب با ورودی برمی‌گردد.
   */
  sendMany?(messages: Array<{ to: string; text: string }>, sender: string): Promise<SmsSendResult[]>;
};

/** حداکثر شماره در هر درخواست، طبق مستندات sms.ir */
const SMSIR_BATCH = 100;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** درگاه آزمایشی — پیامک را فقط در لاگ سرور چاپ می‌کند (محیط توسعه). */
export const consoleProvider: SmsProvider = {
  name: "console",
  async send(to, text) {
    console.info(`[SMS:console] → ${to}\n${text}\n`);
    return { ok: true, providerMessageId: `console-${Date.now()}` };
  },
  async sendMany(messages) {
    for (const message of messages) console.info(`[SMS:console] → ${message.to}\n${message.text}\n`);
    return messages.map((_, index) => ({ ok: true as const, providerMessageId: `console-${Date.now()}-${index}` }));
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

/**
 * sms.ir — REST نسخه ۱.
 * کلید در هدر `X-API-KEY` می‌رود و شماره فرستنده همان «خط ارسال» پنل است.
 * پاسخ موفق `status: 1` دارد؛ هر چیز دیگری خطاست و پیامش به کاربر نشان داده می‌شود.
 */
export function smsIrProvider(apiKey: string): SmsProvider {
  const headers = {
    "content-type": "application/json",
    accept: "application/json",
    "x-api-key": apiKey,
  };

  /** شماره خط در مستندات Long است؛ اگر عددی بود عدد می‌فرستیم. */
  function line(sender: string): number | string {
    return /^\d+$/.test(sender) ? Number(sender) : sender;
  }

  function failure(json: { status?: number; message?: string }, httpStatus: number): string {
    if (httpStatus === 401) return "کلید API پذیرفته نشد. کلید را در پنل sms.ir بررسی کنید.";
    if (httpStatus === 429) return "تعداد درخواست بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید.";
    return json.message ?? `خطای درگاه (${httpStatus})`;
  }

  return {
    name: "smsir",

    async send(to, text, sender) {
      try {
        const res = await fetch("https://api.sms.ir/v1/send/bulk", {
          method: "POST",
          headers,
          body: JSON.stringify({ lineNumber: line(sender), messageText: text, mobiles: [to] }),
          cache: "no-store",
        });
        const json = (await res.json()) as {
          status?: number; message?: string;
          data?: { messageIds?: number[]; packId?: string };
        };
        if (json.status !== 1) return { ok: false, error: failure(json, res.status) };
        return { ok: true, providerMessageId: String(json.data?.messageIds?.[0] ?? json.data?.packId ?? "") };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "خطای شبکه" };
      }
    },

    async sendMany(messages, sender) {
      const results: SmsSendResult[] = [];
      for (const group of chunk(messages, SMSIR_BATCH)) {
        try {
          const res = await fetch("https://api.sms.ir/v1/send/likeToLike", {
            method: "POST",
            headers,
            body: JSON.stringify({
              lineNumber: line(sender),
              messageTexts: group.map((m) => m.text),
              mobiles: group.map((m) => m.to),
            }),
            cache: "no-store",
          });
          const json = (await res.json()) as {
            status?: number; message?: string;
            data?: { messageIds?: number[]; packId?: string };
          };
          if (json.status !== 1) {
            const error = failure(json, res.status);
            for (const _ of group) results.push({ ok: false, error });
            continue;
          }
          // messageIds هم‌ترتیب با ورودی برمی‌گردد.
          group.forEach((_, index) => {
            const id = json.data?.messageIds?.[index];
            results.push({ ok: true, providerMessageId: String(id ?? json.data?.packId ?? "") });
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "خطای شبکه";
          for (const _ of group) results.push({ ok: false, error: message });
        }
      }
      return results;
    },
  };
}

export const SUPPORTED_PROVIDERS = [
  { value: "console", label: "آزمایشی (چاپ در لاگ سرور)" },
  { value: "smsir", label: "sms.ir" },
  { value: "kavenegar", label: "کاوه‌نگار" },
];

/** راهنمای هر درگاه؛ در صفحه تنظیمات پیامک کنار فیلدها نشان داده می‌شود. */
export const PROVIDER_HELP: Record<string, { apiKey: string; sender: string; docs?: string }> = {
  console: {
    apiKey: "در حالت آزمایشی لازم نیست؛ پیامک فقط در لاگ سرور چاپ می‌شود.",
    sender: "هر مقداری بگذارید فرقی نمی‌کند.",
  },
  smsir: {
    apiKey:
      "پنل sms.ir ← برنامه‌نویسان ← لیست کلیدهای API ← ایجاد کلید جدید. " +
      "«محدود کردن به IP» را خالی بگذارید؛ این سامانه آی‌پی ثابت ندارد و با محدودیت IP ارسال قطع می‌شود. " +
      "برای آزمایش بدون کسر اعتبار، کلید از نوع Sandbox بسازید.",
    sender: "شماره «خط ارسال» پنل sms.ir، مثل ۳۰۰۰۴۵۰۵۰۰۰۰۱۷. فهرست خطوط فعالتان در همان پنل هست.",
    docs: "https://app.sms.ir/developer/help/introduction",
  },
  kavenegar: {
    apiKey: "در پنل کاوه‌نگار: تنظیمات ← کلید وب‌سرویس.",
    sender: "خط ارسال اختصاصی شما در کاوه‌نگار.",
  },
};

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
