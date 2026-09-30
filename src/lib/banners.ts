/**
 * بنرهای صفحه ورود.
 *
 * مقدار ذخیره‌شده دو شکل دارد: شکل قدیمی فقط یک آرایه از بنرها بود، شکل تازه
 * تنظیمات اسلاید (پوشش تیره و مدت هر بنر) را هم کنارش نگه می‌دارد. هر دو اینجا
 * خوانده می‌شوند تا بنرهای ثبت‌شده با به‌روزرسانی از بین نروند.
 */
export type Banner = { src: string; caption: string };

export type BannerSettings = {
  items: Banner[];
  /** درصد تیرگی روی تصویر: ۰ یعنی تصویر کاملاً واضح، ۱۰۰ یعنی کاملاً پوشیده */
  overlay: number;
  /** مدت نمایش هر بنر به ثانیه */
  seconds: number;
};

export const BANNER_DEFAULTS = { overlay: 45, seconds: 10 };

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.round(num)));
}

export function parseBanners(stored: unknown): BannerSettings {
  const raw: Partial<BannerSettings> = Array.isArray(stored)
    ? { items: stored as Banner[] }
    : ((stored as Partial<BannerSettings> | null) ?? {});
  const items = Array.isArray(raw.items) ? raw.items : [];
  return {
    items: items
      .filter((b): b is Banner => Boolean(b && typeof b.src === "string" && b.src))
      .map((b) => ({ src: b.src, caption: typeof b.caption === "string" ? b.caption : "" })),
    overlay: clamp(raw.overlay, 0, 100, BANNER_DEFAULTS.overlay),
    seconds: clamp(raw.seconds, 3, 120, BANNER_DEFAULTS.seconds),
  };
}
