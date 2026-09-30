/**
 * پیام‌رسان بله: خبر دادن نامه تازه به تأییدکننده، کنار پیامک.
 *
 * API بله همان شکل تلگرام است: POST به
 * https://tapi.bale.ai/bot<token>/sendMessage با chat_id و text.
 *
 * برای اینکه کاربر پیام بگیرد، باید اول خودش در بله به ربات سازمان پیام بدهد
 * (ربات نمی‌تواند به کسی که شروع نکرده پیام بفرستد) و شناسه گفت‌وگویش در پروفایل
 * ثبت شود.
 */
const BALE_API = "https://tapi.bale.ai";

export type BaleResult = { ok: true } | { ok: false; error: string };

export async function sendBale(token: string, chatId: string, text: string): Promise<BaleResult> {
  try {
    const res = await fetch(`${BALE_API}/bot${encodeURIComponent(token)}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
      // اگر بله کند بود، گردش تأیید نباید پشتش بماند
      signal: AbortSignal.timeout(8000),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
    if (res.status === 401 || res.status === 404) return { ok: false, error: "توکن ربات بله پذیرفته نشد." };
    if (!res.ok || json?.ok === false) return { ok: false, error: json?.description ?? `خطای بله (${res.status})` };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "ارتباط با بله برقرار نشد." };
  }
}
