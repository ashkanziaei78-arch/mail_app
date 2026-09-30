import { themeById, themeCss } from "@/lib/themes";

/**
 * تزریق تم رنگی سازمان.
 *
 * فقط چند متغیر CSS را بازنویسی می‌کند، پس هیچ فایل استایل تازه‌ای بار نمی‌شود
 * و تغییر تم با یک رفرش دیده می‌شود. چون سمت سرور رندر می‌شود، پرش رنگ اولیه هم
 * ندارد.
 */
export default function ThemeStyle({ themeId }: { themeId: string | null | undefined }) {
  return <style dangerouslySetInnerHTML={{ __html: themeCss(themeById(themeId)) }} />;
}
