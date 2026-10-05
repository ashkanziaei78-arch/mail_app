/**
 * پیام‌رسان‌ها: بله، تلگرام و ایتا.
 *
 * هر سه ربات دارند و هر سه «چت آیدی» می‌خواهند، ولی شکل درخواستشان یکی نیست:
 * بله و تلگرام API یکسان دارند (/bot<token>/sendMessage با JSON)، ایتا نشانی و
 * پارامتر خودش را دارد. این فایل همان تفاوت را پنهان می‌کند و بیرون فقط
 * «توکن + شناسه گفت‌وگو + متن» دیده می‌شود.
 *
 * نکته مشترک هر سه: ربات تا وقتی کاربر خودش به آن پیام نداده، نمی‌تواند برایش
 * پیام بفرستد. برای همین شناسه گفت‌وگو را خود کاربر در پروفایلش ثبت می‌کند.
 */
export const MESSENGERS = [
  { id: "bale", label: "بله", hint: "ربات را در بله با @BotFather بسازید." },
  { id: "telegram", label: "تلگرام", hint: "ربات را در تلگرام با @BotFather بسازید." },
  { id: "eitaa", label: "ایتا", hint: "توکن را از eitaayar.ir بگیرید (سرویس ربات ایتا)." },
] as const;

export type MessengerId = (typeof MESSENGERS)[number]["id"];

export type MessengerResult = { ok: true } | { ok: false; error: string };

export async function sendMessenger(
  messenger: MessengerId,
  token: string,
  chatId: string,
  text: string,
): Promise<MessengerResult> {
  try {
    const request: { url: string; init: RequestInit } =
      messenger === "eitaa"
        ? {
            url: `https://eitaayar.ir/api/${encodeURIComponent(token)}/sendMessage`,
            init: {
              method: "POST",
              headers: { "content-type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({ chat_id: chatId, text }).toString(),
            },
          }
        : {
            url: `${messenger === "bale" ? "https://tapi.bale.ai" : "https://api.telegram.org"}/bot${encodeURIComponent(token)}/sendMessage`,
            init: {
              method: "POST",
              headers: { "content-type": "application/json", accept: "application/json" },
              body: JSON.stringify({ chat_id: chatId, text }),
            },
          };

    const res = await fetch(request.url, {
      ...request.init,
      // پیام‌رسان کند نباید گردش تأیید را پشت خودش نگه دارد
      signal: AbortSignal.timeout(8000),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
    if (res.status === 401 || res.status === 404) return { ok: false, error: "توکن ربات پذیرفته نشد." };
    if (!res.ok || json?.ok === false) return { ok: false, error: json?.description ?? `خطای پیام‌رسان (${res.status})` };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "ارتباط با پیام‌رسان برقرار نشد." };
  }
}
