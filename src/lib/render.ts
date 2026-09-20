import { faDate } from "./jalali";

/** متغیرهای مجاز در متن نامه و پیامک */
export const LETTER_VARIABLES = [
  { token: "{{عنوان}}", description: "عنوان رسمی خطاب (جناب آقای / سرکار خانم)" },
  { token: "{{نام}}", description: "نام" },
  { token: "{{نام_خانوادگی}}", description: "نام خانوادگی" },
  { token: "{{نام_کامل}}", description: "نام و نام خانوادگی" },
  { token: "{{سمت}}", description: "سمت مخاطب" },
  { token: "{{سازمان}}", description: "سازمان مخاطب" },
  { token: "{{شهر}}", description: "شهر مخاطب" },
  { token: "{{موبایل}}", description: "شماره همراه مخاطب" },
  { token: "{{سازمان_فرستنده}}", description: "نام سازمان فرستنده" },
  { token: "{{تاریخ}}", description: "تاریخ نامه (شمسی)" },
  { token: "{{شماره_نامه}}", description: "شماره/شناسه نامه" },
] as const;

export const SMS_VARIABLES = [
  ...LETTER_VARIABLES,
  { token: "{{لینک}}", description: "لینک کوتاه مشاهده نامه" },
  { token: "{{کد_دسترسی}}", description: "کد دسترسی نامه محرمانه" },
] as const;

export type RenderContext = Record<string, string>;

export function buildContext(input: {
  formalTitle?: string | null;
  firstName: string;
  lastName: string;
  jobTitle?: string | null;
  contactOrganization?: string | null;
  city?: string | null;
  mobilePhone?: string | null;
  senderOrganization: string;
  letterDate?: Date | null;
  letterNumber?: string | null;
  shortLink?: string;
  accessCode?: string;
}): RenderContext {
  return {
    "{{عنوان}}": input.formalTitle ?? "",
    "{{نام}}": input.firstName,
    "{{نام_خانوادگی}}": input.lastName,
    "{{نام_کامل}}": `${input.firstName} ${input.lastName}`.trim(),
    "{{سمت}}": input.jobTitle ?? "",
    "{{سازمان}}": input.contactOrganization ?? "",
    "{{شهر}}": input.city ?? "",
    "{{موبایل}}": input.mobilePhone ?? "",
    "{{سازمان_فرستنده}}": input.senderOrganization,
    "{{تاریخ}}": faDate(input.letterDate ?? new Date()),
    "{{شماره_نامه}}": input.letterNumber ?? "",
    "{{لینک}}": input.shortLink ?? "",
    "{{کد_دسترسی}}": input.accessCode ?? "",
  };
}

/** جایگذاری متغیرها. متغیر ناشناخته دست‌نخورده می‌ماند تا در پیش‌نمایش دیده شود. */
export function applyVariables(text: string, context: RenderContext): string {
  return text.replace(/\{\{[^{}]+\}\}/g, (token) => context[token] ?? token);
}

export function missingVariables(text: string, context: RenderContext): string[] {
  const found = text.match(/\{\{[^{}]+\}\}/g) ?? [];
  return [...new Set(found.filter((t) => context[t] === undefined))];
}

// ---------------------------------------------------------
// پاک‌سازی HTML نامه (ضد XSS) — متن نامه توسط کاربر نوشته می‌شود
// و در صفحه عمومی لینک کوتاه رندر می‌گردد.
// ---------------------------------------------------------
const ALLOWED_TAGS = new Set([
  "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "span", "div",
  "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "ul", "ol", "li",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th", "a", "img", "figure", "figcaption",
]);
const ALLOWED_ATTRS = new Set(["href", "src", "alt", "title", "colspan", "rowspan", "dir", "style"]);
const SAFE_STYLE = /^(text-align|font-weight|font-style|text-decoration|width|height|margin|padding|color|background-color)\s*:\s*[#\w%.,()\s-]+$/i;

function sanitizeAttrs(raw: string): string {
  const out: string[] = [];
  const re = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const name = m[1].toLowerCase();
    const value = (m[3] ?? m[4] ?? "").trim();
    if (!ALLOWED_ATTRS.has(name)) continue;
    if ((name === "href" || name === "src") && !/^(https?:\/\/|\/|mailto:|data:image\/(png|jpeg|gif|webp);base64,)/i.test(value)) continue;
    if (name === "style") {
      const safe = value.split(";").map((d) => d.trim()).filter((d) => d && SAFE_STYLE.test(d));
      if (!safe.length) continue;
      out.push(`style="${safe.join("; ")}"`);
      continue;
    }
    out.push(`${name}="${value.replace(/"/g, "&quot;")}"`);
  }
  return out.length ? " " + out.join(" ") : "";
}

/** فقط تگ‌های سفیدلیست‌شده و صفات امن باقی می‌مانند؛ بقیه escape می‌شوند. */
export function sanitizeHtml(html: string): string {
  const withoutBlocks = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|svg|math|form)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|embed|svg|math|form)\b[^>]*>/gi, "");

  return withoutBlocks.replace(/<\/?([a-zA-Z0-9-]+)((?:[^<>"']|"[^"]*"|'[^']*')*)\/?>/g, (match, tagName: string, attrs: string) => {
    const tag = tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return match.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (match.startsWith("</")) return `</${tag}>`;
    const selfClosing = tag === "br" || tag === "hr" || tag === "img";
    return `<${tag}${sanitizeAttrs(attrs)}${selfClosing ? " /" : ""}>`;
  });
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
