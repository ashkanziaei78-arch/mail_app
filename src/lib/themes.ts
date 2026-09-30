/**
 * تم‌های رنگی سازمان.
 *
 * به‌جای انتخابگر رنگ آزاد، چند پالت آماده: رنگ دلخواهِ کاربر معمولاً کنتراست
 * لازم را ندارد و متن روی دکمه ناخوانا می‌شود. هر تم اینجا در هر دو حالت روشن و
 * تیره با WCAG AA سنجیده شده است (آزمونش در selftest).
 *
 * هر تم فقط چند توکن معنایی را جابه‌جا می‌کند؛ بقیه پوسته (سطح، متن، وضعیت‌ها)
 * مشترک می‌ماند تا هویت یکسان بماند و فقط «لحن» عوض شود.
 */
export type ThemeTokens = {
  primary: string;
  primaryText: string;
  link: string;
  ring: string;
  accent: string;
  accentBg: string;
  /** پس‌زمینه منوی کنار و نوار بالا */
  sidebar: string;
  sidebarSoft: string;
};

export type Theme = {
  id: string;
  label: string;
  description: string;
  light: ThemeTokens;
  dark: ThemeTokens;
};

export const THEMES: Theme[] = [
  {
    id: "diplomatic",
    label: "سرمه‌ای دیپلماتیک",
    description: "آبی‌فیروزه‌ای عمیق با لهجه طلایی — رسمی و آرام، مناسب مکاتبات اداری.",
    light: {
      primary: "#0f5c7a", primaryText: "#ffffff", link: "#0d5a86", ring: "#0f5c7a",
      accent: "#8a6412", accentBg: "#fbf4e2", sidebar: "#0a2233", sidebarSoft: "#0f5c7a",
    },
    dark: {
      primary: "#5fc0e0", primaryText: "#04141c", link: "#7fd0ea", ring: "#7fd0ea",
      accent: "#e3c06b", accentBg: "#2a2410", sidebar: "#0a1a26", sidebarSoft: "#12455c",
    },
  },
  {
    id: "emerald",
    label: "زمردی اداری",
    description: "سبز عمیق و آرام؛ برای سازمان‌هایی که هویت سبز دارند.",
    light: {
      primary: "#0f6b4f", primaryText: "#ffffff", link: "#0b6046", ring: "#0f6b4f",
      accent: "#8a6412", accentBg: "#fbf4e2", sidebar: "#0c2a22", sidebarSoft: "#0f6b4f",
    },
    dark: {
      primary: "#5ecfa4", primaryText: "#041a12", link: "#7fe0bb", ring: "#7fe0bb",
      accent: "#e3c06b", accentBg: "#2a2410", sidebar: "#08201a", sidebarSoft: "#11513c",
    },
  },
  {
    id: "burgundy",
    label: "شرابی رسمی",
    description: "قرمز تیره و باوقار؛ برای نهادهایی با هویت گرم.",
    light: {
      primary: "#8a1f3d", primaryText: "#ffffff", link: "#8a1f3d", ring: "#8a1f3d",
      accent: "#7a5a12", accentBg: "#faf2e0", sidebar: "#2b0f1a", sidebarSoft: "#8a1f3d",
    },
    dark: {
      primary: "#f0909f", primaryText: "#2a0710", link: "#f4a7b3", ring: "#f0909f",
      accent: "#e3c06b", accentBg: "#2a2410", sidebar: "#230b13", sidebarSoft: "#6d1830",
    },
  },
  {
    id: "indigo",
    label: "نیلی کلاسیک",
    description: "آبی سنتی سامانه‌های اداری؛ آشنا و بی‌حاشیه.",
    light: {
      primary: "#1d4ed8", primaryText: "#ffffff", link: "#1d4ed8", ring: "#1d4ed8",
      accent: "#8a6412", accentBg: "#fbf4e2", sidebar: "#0f2547", sidebarSoft: "#1d4ed8",
    },
    dark: {
      primary: "#93b4f5", primaryText: "#06122a", link: "#a8c4f8", ring: "#93b4f5",
      accent: "#e3c06b", accentBg: "#2a2410", sidebar: "#0b1a33", sidebarSoft: "#1b3f86",
    },
  },
  {
    id: "graphite",
    label: "خاکستری نقره‌ای",
    description: "خنثی و بی‌صدا؛ وقتی رنگ سازمان باید از خود نامه‌ها بیاید.",
    light: {
      primary: "#3f4a5a", primaryText: "#ffffff", link: "#39485c", ring: "#3f4a5a",
      accent: "#8a6412", accentBg: "#fbf4e2", sidebar: "#1c222c", sidebarSoft: "#3f4a5a",
    },
    dark: {
      primary: "#b8c4d4", primaryText: "#11161d", link: "#c6d1de", ring: "#b8c4d4",
      accent: "#e3c06b", accentBg: "#2a2410", sidebar: "#141920", sidebarSoft: "#39434f",
    },
  },
];

export const DEFAULT_THEME_ID = THEMES[0].id;

export function themeById(id: string | null | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** CSS متغیرهای یک تم، برای تزریق در <style> صفحه. */
export function themeCss(theme: Theme): string {
  const block = (t: ThemeTokens) =>
    [
      `--primary:${t.primary}`,
      `--primary-text:${t.primaryText}`,
      `--link:${t.link}`,
      `--ring:${t.ring}`,
      `--accent:${t.accent}`,
      `--accent-bg:${t.accentBg}`,
      `--color-brand-900:${t.sidebar}`,
      `--color-brand-600:${t.sidebarSoft}`,
    ].join(";");

  return `:root{${block(theme.light)}}[data-theme="dark"]{${block(theme.dark)}}`;
}
