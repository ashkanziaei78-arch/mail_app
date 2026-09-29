/**
 * گالری عکس پروفایل.
 *
 * عمداً عکس آدم واقعی نیست: گذاشتن چهره یک غریبه به‌عنوان عکس یک کارمند سازمان،
 * هم گمراه‌کننده است و هم حق تصویر آن شخص را زیر پا می‌گذارد. به‌جایش طرح‌های
 * تزئینی داریم، و هرکس بخواهد عکس خودش را آپلود می‌کند.
 *
 * هر طرح یک SVG کوچک است که همان‌جا ساخته می‌شود — بدون درخواست شبکه.
 */
export type AvatarStyle = { id: string; label: string; from: string; to: string; shape: "rings" | "waves" | "grid" | "burst" };

export const AVATAR_STYLES: AvatarStyle[] = [
  { id: "indigo-rings", label: "حلقه‌های نیلی", from: "#1e3a8a", to: "#3b82f6", shape: "rings" },
  { id: "teal-waves", label: "موج فیروزه‌ای", from: "#0f766e", to: "#2dd4bf", shape: "waves" },
  { id: "amber-grid", label: "شبکه کهربایی", from: "#92400e", to: "#f59e0b", shape: "grid" },
  { id: "rose-burst", label: "پرتو گلبهی", from: "#9f1239", to: "#fb7185", shape: "burst" },
  { id: "violet-rings", label: "حلقه‌های بنفش", from: "#5b21b6", to: "#a78bfa", shape: "rings" },
  { id: "emerald-grid", label: "شبکه زمردی", from: "#065f46", to: "#34d399", shape: "grid" },
  { id: "slate-waves", label: "موج فولادی", from: "#1e293b", to: "#94a3b8", shape: "waves" },
  { id: "sky-burst", label: "پرتو آسمانی", from: "#075985", to: "#38bdf8", shape: "burst" },
  { id: "orange-waves", label: "موج نارنجی", from: "#7c2d12", to: "#fb923c", shape: "waves" },
  { id: "lime-rings", label: "حلقه‌های لیمویی", from: "#3f6212", to: "#a3e635", shape: "rings" },
  { id: "fuchsia-grid", label: "شبکه ارغوانی", from: "#701a75", to: "#e879f9", shape: "grid" },
  { id: "cyan-burst", label: "پرتو لاجوردی", from: "#164e63", to: "#22d3ee", shape: "burst" },
];

function pattern(style: AvatarStyle): string {
  switch (style.shape) {
    case "rings":
      return `<circle cx="50" cy="50" r="30" fill="none" stroke="#fff" stroke-opacity=".30" stroke-width="7"/>
              <circle cx="50" cy="50" r="15" fill="#fff" fill-opacity=".22"/>`;
    case "waves":
      return `<path d="M0 62 Q25 44 50 62 T100 62 V100 H0Z" fill="#fff" fill-opacity=".20"/>
              <path d="M0 76 Q25 58 50 76 T100 76 V100 H0Z" fill="#fff" fill-opacity=".16"/>`;
    case "grid":
      return `<g fill="#fff" fill-opacity=".22">
                <rect x="18" y="18" width="26" height="26" rx="7"/>
                <rect x="56" y="18" width="26" height="26" rx="7"/>
                <rect x="18" y="56" width="26" height="26" rx="7"/>
              </g>`;
    default:
      return `<g stroke="#fff" stroke-opacity=".28" stroke-width="6" stroke-linecap="round">
                <path d="M50 16 V38"/><path d="M50 62 V84"/><path d="M16 50 H38"/><path d="M62 50 H84"/>
              </g>
              <circle cx="50" cy="50" r="10" fill="#fff" fill-opacity=".30"/>`;
  }
}

/** SVG طرح را به‌صورت data: برمی‌گرداند تا مستقیم در src یک <img> بنشیند. */
export function avatarDataUrl(id: string): string | null {
  const style = AVATAR_STYLES.find((s) => s.id === id);
  if (!style) return null;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${style.from}"/><stop offset="1" stop-color="${style.to}"/>` +
    `</linearGradient></defs>` +
    `<rect width="100" height="100" fill="url(#g)"/>${pattern(style)}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * مقدار ذخیره‌شده را به نشانی قابل نمایش تبدیل می‌کند.
 * دو حالت دارد: `avatar:<id>` یعنی طرح گالری، هر چیز دیگر یعنی فایل آپلودی.
 */
export function avatarSrc(stored: string | null | undefined): string | null {
  if (!stored) return null;
  return stored.startsWith("avatar:") ? avatarDataUrl(stored.slice(7)) : stored;
}
