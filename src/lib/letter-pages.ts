/**
 * نامه چندصفحه‌ای.
 *
 * کاربر با دکمه «صفحه بعد» یک نشانه در متن می‌گذارد و نامه از همان‌جا به صفحه
 * تازه می‌رود؛ هر صفحه سربرگ خودش را دارد و در چاپ هم از همان‌جا می‌شکند.
 * نشانه یک <hr class="page-break"> ساده است تا از پاک‌سازی HTML سالم رد شود.
 */
export const PAGE_BREAK_HTML = '<hr class="page-break" />';

const SPLITTER = /<hr[^>]*class="[^"]*page-break[^"]*"[^>]*>/gi;

export function splitPages(html: string): string[] {
  const parts = html.split(SPLITTER).map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts : [html];
}
