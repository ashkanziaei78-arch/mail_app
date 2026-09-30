/**
 * تم‌های رنگی سازمان.
 *
 * هر تم فقط سه رنگ پایه دارد (رنگ اصلی، رنگ منو، لهجه) و بقیه — پس‌زمینه، سطح
 * کارت‌ها، مرزها، رنگ لینک و حلقه فوکوس — از همان‌ها ساخته می‌شود. این‌طور
 * افزودن پالت تازه یک سطر است و کل پوسته (نه فقط دکمه‌ها) رنگ می‌گیرد.
 *
 * به‌جای انتخابگر رنگ آزاد، فهرست آماده: رنگ دلخواهِ کاربر معمولاً کنتراست لازم
 * را ندارد و متن روی دکمه ناخوانا می‌شود. کنتراست همه تم‌ها در هر دو حالت روشن
 * و تیره در selftest سنجیده می‌شود.
 */
export type ThemeSeed = {
  id: string;
  label: string;
  description: string;
  /** رنگ کنش‌ها در حالت روشن */
  primary: string;
  /** همان رنگ برای حالت تیره — روشن‌تر، تا روی پس‌زمینه تیره خوانا بماند */
  primaryDark: string;
  /** پس‌زمینه منوی کنار */
  sidebar: string;
  /** لهجه رسمی (مهر، تأکید کوچک) */
  accent: string;
  accentDark: string;
};

export type ThemeTokens = {
  primary: string;
  primaryText: string;
  link: string;
  ring: string;
  accent: string;
  accentBg: string;
  sidebar: string;
  sidebarSoft: string;
  bg: string;
  surface: string;
  surface2: string;
  border: string;
};

export type Theme = ThemeSeed & { light: ThemeTokens; dark: ThemeTokens };

const SEEDS: ThemeSeed[] = [
  {
    id: "diplomatic",
    label: "سرمه‌ای دیپلماتیک",
    description: "آبی‌فیروزه‌ای عمیق با لهجه طلایی — رسمی و آرام، مناسب مکاتبات اداری.",
    primary: "#0f5c7a", primaryDark: "#5fc0e0", sidebar: "#0a2233", accent: "#8a6412", accentDark: "#e3c06b",
  },
  {
    id: "emerald",
    label: "زمردی اداری",
    description: "سبز عمیق و آرام؛ برای سازمان‌هایی که هویت سبز دارند.",
    primary: "#0f6b4f", primaryDark: "#5ecfa4", sidebar: "#0c2a22", accent: "#8a6412", accentDark: "#e3c06b",
  },
  {
    id: "burgundy",
    label: "شرابی رسمی",
    description: "قرمز تیره و باوقار؛ برای نهادهایی با هویت گرم.",
    primary: "#8a1f3d", primaryDark: "#f0909f", sidebar: "#2b0f1a", accent: "#7a5a12", accentDark: "#e3c06b",
  },
  {
    id: "indigo",
    label: "نیلی کلاسیک",
    description: "آبی سنتی سامانه‌های اداری؛ آشنا و بی‌حاشیه.",
    primary: "#1d4ed8", primaryDark: "#93b4f5", sidebar: "#0f2547", accent: "#8a6412", accentDark: "#e3c06b",
  },
  {
    id: "graphite",
    label: "خاکستری نقره‌ای",
    description: "خنثی و بی‌صدا؛ وقتی رنگ سازمان باید از خود نامه‌ها بیاید.",
    primary: "#3f4a5a", primaryDark: "#b8c4d4", sidebar: "#1c222c", accent: "#8a6412", accentDark: "#e3c06b",
  },
  {
    id: "royal-purple",
    label: "بنفش سلطنتی",
    description: "بنفش عمیق و باوقار؛ متمایز بدون اینکه پرسروصدا باشد.",
    primary: "#5b2a86", primaryDark: "#c6a2e8", sidebar: "#221037", accent: "#8a6412", accentDark: "#e3c06b",
  },
  {
    id: "copper",
    label: "مسی خاکی",
    description: "نارنجی سوخته و خاکی؛ گرم و زمینی، هم‌خوان با معماری کویری.",
    primary: "#9a4a16", primaryDark: "#f0a874", sidebar: "#2e1608", accent: "#6b5a18", accentDark: "#e8cf86",
  },
  {
    id: "teal-night",
    label: "فیروزه‌ای شب",
    description: "فیروزه‌ای تیره و مدرن؛ خنک و تمیز.",
    primary: "#0d6b6b", primaryDark: "#63d3d3", sidebar: "#08292b", accent: "#8a6412", accentDark: "#e3c06b",
  },
  {
    id: "olive",
    label: "زیتونی آرام",
    description: "سبز زیتونی ملایم؛ طبیعی و بی‌تنش برای کار طولانی.",
    primary: "#4f6b1f", primaryDark: "#b6d275", sidebar: "#1e2610", accent: "#7a5a12", accentDark: "#e3c06b",
  },
  {
    id: "navy-gold",
    label: "لاجوردی و طلا",
    description: "لاجوردی عمیق با طلای پررنگ‌تر؛ رسمی‌ترین حالت، مناسب مکاتبات تشریفاتی.",
    primary: "#1a3a6b", primaryDark: "#9bb8ea", sidebar: "#0c1c38", accent: "#7d6010", accentDark: "#efc96f",
  },
  {
    id: "slate-rose",
    label: "دودی و گلبهی",
    description: "خاکستری آبی با لهجه گلبهی؛ آرام و امروزی.",
    primary: "#4a5568", primaryDark: "#b9c4d6", sidebar: "#1b2230", accent: "#9a3055", accentDark: "#f2a8bf",
  },
  {
    id: "forest",
    label: "جنگلی تیره",
    description: "سبز تیره و متین؛ برای هویت‌های محیط‌زیستی و پژوهشی.",
    primary: "#1f5132", primaryDark: "#79c99a", sidebar: "#0d2317", accent: "#8a6412", accentDark: "#e3c06b",
  },
];

/** ترکیب دو رنگ با درصد مشخص — برای ساختن سطح‌های هم‌خانواده با رنگ تم. */
function mix(base: string, tint: string, amount: number): string {
  const parse = (hex: string) => (hex.replace("#", "").match(/../g) ?? []).map((p) => parseInt(p, 16));
  const [r1, g1, b1] = parse(base);
  const [r2, g2, b2] = parse(tint);
  const blend = (a: number, b: number) => Math.round(a + (b - a) * amount);
  return `#${[blend(r1, r2), blend(g1, g2), blend(b1, b2)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** رنگ متن روی یک پس‌زمینه: هر کدام کنتراست بیشتری بدهد، همان انتخاب می‌شود. */
function readableOn(background: string): string {
  const candidates = ["#ffffff", "#0b1220"];
  return candidates.reduce((best, candidate) =>
    contrast(candidate, background) > contrast(best, background) ? candidate : best,
  );
}

function luminance(hex: string): number {
  const channels = (hex.replace("#", "").match(/../g) ?? []).map((part) => {
    const value = parseInt(part, 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

const LIGHT_BASE = { bg: "#f5f7fa", surface: "#ffffff", surface2: "#eff3f8", border: "#c9d4e1" };
const DARK_BASE = { bg: "#0a121d", surface: "#101a29", surface2: "#16223a", border: "#26344b" };

function build(seed: ThemeSeed): Theme {
  return {
    ...seed,
    light: {
      primary: seed.primary,
      primaryText: readableOn(seed.primary),
      // لینک روی سطح سفید می‌نشیند؛ کمی تیره‌تر از دکمه تا خوانا بماند
      link: mix(seed.primary, "#000000", 0.08),
      ring: seed.primary,
      accent: seed.accent,
      accentBg: mix("#ffffff", seed.accent, 0.10),
      sidebar: seed.sidebar,
      sidebarSoft: seed.primary,
      // سطح‌ها فقط کمی به رنگ تم مایل می‌شوند تا پوسته یکدست شود، نه رنگی
      bg: mix(LIGHT_BASE.bg, seed.primary, 0.06),
      surface: LIGHT_BASE.surface,
      surface2: mix(LIGHT_BASE.surface2, seed.primary, 0.07),
      border: mix(LIGHT_BASE.border, seed.primary, 0.18),
    },
    dark: {
      primary: seed.primaryDark,
      primaryText: readableOn(seed.primaryDark),
      link: mix(seed.primaryDark, "#ffffff", 0.12),
      ring: seed.primaryDark,
      accent: seed.accentDark,
      accentBg: mix("#15110a", seed.accentDark, 0.10),
      sidebar: mix(seed.sidebar, "#000000", 0.25),
      sidebarSoft: seed.primary,
      bg: mix(DARK_BASE.bg, seed.primaryDark, 0.05),
      surface: mix(DARK_BASE.surface, seed.primaryDark, 0.06),
      surface2: mix(DARK_BASE.surface2, seed.primaryDark, 0.08),
      border: mix(DARK_BASE.border, seed.primaryDark, 0.16),
    },
  };
}

export const THEMES: Theme[] = SEEDS.map(build);

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
      `--bg:${t.bg}`,
      `--surface:${t.surface}`,
      `--surface-2:${t.surface2}`,
      `--border:${t.border}`,
      `--color-brand-900:${t.sidebar}`,
      `--color-brand-600:${t.sidebarSoft}`,
    ].join(";");

  // ترتیب مهم است: بلوک تیره بعد از :root می‌آید تا در حالت تیره برنده شود
  return `:root{${block(theme.light)}}[data-theme="dark"]{${block(theme.dark)}}`;
}
