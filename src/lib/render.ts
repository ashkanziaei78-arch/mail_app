import sanitize from "sanitize-html";

import { faDate } from "./jalali";

/**
 * متغیرهای مجاز در متن نامه و پیامک.
 * `example` همان چیزی است که در پیش‌نمایش جای متغیر می‌نشیند تا کاربر قبل از
 * ارسال ببیند نامه چه شکلی درمی‌آید.
 */
export const LETTER_VARIABLES = [
  { token: "{{عنوان}}", description: "عنوان رسمی خطاب (جناب آقای / سرکار خانم)", example: "جناب آقای" },
  { token: "{{نام}}", description: "نام", example: "حسین" },
  { token: "{{نام_خانوادگی}}", description: "نام خانوادگی", example: "موسوی" },
  { token: "{{نام_کامل}}", description: "نام و نام خانوادگی", example: "حسین موسوی" },
  { token: "{{سمت}}", description: "سمت مخاطب", example: "مدیرعامل" },
  { token: "{{سازمان}}", description: "سازمان مخاطب", example: "اتاق بازرگانی یزد" },
  { token: "{{شهر}}", description: "شهر مخاطب", example: "یزد" },
  { token: "{{موبایل}}", description: "شماره همراه مخاطب", example: "۰۹۱۲۳۴۵۶۷۸۹" },
  { token: "{{سازمان_فرستنده}}", description: "نام سازمان فرستنده", example: "پارک علم و فناوری یزد" },
  { token: "{{تاریخ}}", description: "تاریخ نامه (شمسی)", example: "۱۴۰۴/۰۷/۰۵" },
  { token: "{{شماره_نامه}}", description: "شماره/شناسه نامه", example: "۱۴۰۴/۲۳۷/ص" },
] as const;

export const SMS_VARIABLES = [
  ...LETTER_VARIABLES,
  { token: "{{لینک}}", description: "لینک کوتاه مشاهده نامه", example: "https://example.ir/l/Ab3xK9pQ2t" },
  { token: "{{کد_دسترسی}}", description: "کد دسترسی نامه محرمانه", example: "۸۳۵۱۹۲" },
  { token: "{{لغو_اشتراک}}", description: "لینک لغو دریافت پیامک (توصیه می‌شود در انتهای پیامک بیاید)", example: "https://example.ir/u/9Kd2" },
] as const;

export type LetterVariable = { token: string; description: string; example: string };

/**
 * متغیر را سر جای مکان‌نما می‌گذارد و خودش فاصله لازم را اضافه می‌کند.
 *
 * بدون این کار، کلیک روی «{{نام}}» بعد از کلمه‌ای مثل «آقای» می‌شود
 * «آقای{{نام}}» و در نامه نهایی «آقایحسین» چاپ می‌شود. اینجا اگر کاراکتر قبل یا
 * بعدِ محل درج فاصله یا خط جدید نباشد، یک فاصله گذاشته می‌شود؛ اگر باشد، فاصله
 * دوم اضافه نمی‌شود.
 */
export function insertVariable(text: string, start: number, end: number, token: string) {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const needsLeading = before.length > 0 && !/[\s\u200c(«"'>]$/.test(before);
  const needsTrailing = after.length > 0 && !/^[\s\u200c)».,،:;!?"'<]/.test(after);
  const inserted = `${needsLeading ? " " : ""}${token}${needsTrailing ? " " : ""}`;
  return { text: before + inserted + after, caret: before.length + inserted.length };
}

/** متن را با مقدارهای نمونه پر می‌کند تا کاربر پیش‌نمایش واقعی ببیند. */
export function fillWithExamples(text: string, variables: readonly LetterVariable[]) {
  let out = text;
  for (const variable of variables) out = out.split(variable.token).join(variable.example);
  return out;
}

export type RenderContext = Record<string, string>;

/** مقدار فیلدهای سربرگ را به‌صورت {{فیلد:key}} وارد بافت جایگذاری می‌کند. */
export function withLetterheadFields(
  context: RenderContext,
  fields: Array<{ key: string; type: string }>,
  values: Record<string, string> | null | undefined,
): RenderContext {
  const merged = { ...context };
  for (const field of fields) {
    const raw = values?.[field.key] ?? "";
    // تاریخ در پایگاه داده ISO است ولی در نامه باید شمسی دیده شود
    merged[`{{فیلد:${field.key}}}`] = field.type === "DATE" && raw ? faDate(raw) : raw;
  }
  return merged;
}

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
  unsubscribeUrl?: string;
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
    "{{لغو_اشتراک}}": input.unsubscribeUrl ?? "",
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
// پاک‌سازی HTML نامه (ضد XSS)
//
// متن نامه را کاربر سازمان می‌نویسد و در صفحه عمومی لینک کوتاه — بدون احراز
// هویت و برای گیرنده‌ای بیرون سازمان — رندر می‌شود. پاک‌سازی دست‌ساز با regex
// در برابر mutation-XSS شکننده است، پس از sanitize-html (بر پایه htmlparser2)
// استفاده می‌کنیم که پارسر واقعی دارد.
// ---------------------------------------------------------

const SAFE_STYLE = {
  "text-align": [/^(right|left|center|justify)$/],
  "font-weight": [/^(normal|bold|[1-9]00)$/],
  "font-style": [/^(normal|italic)$/],
  "text-decoration": [/^(none|underline|line-through)$/],
  "color": [/^#[0-9a-f]{3,8}$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/],
  "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/],
  "width": [/^\d+(\.\d+)?(px|%|em|rem)$/],
  "height": [/^\d+(\.\d+)?(px|%|em|rem)$/],
  "margin": [/^[\d.\s]+(px|%|em|rem)?$/],
  "padding": [/^[\d.\s]+(px|%|em|rem)?$/],
};

const OPTIONS: sanitize.IOptions = {
  allowedTags: [
    "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "span", "div",
    "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "ul", "ol", "li",
    "table", "thead", "tbody", "tfoot", "tr", "td", "th", "a", "img", "figure", "figcaption",
  ],
  allowedAttributes: {
    a: ["href", "title", "dir", "style", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    td: ["colspan", "rowspan", "dir", "style"],
    th: ["colspan", "rowspan", "dir", "style"],
    "*": ["dir", "style"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  allowProtocolRelative: false,
  allowedStyles: { "*": SAFE_STYLE },
  // لینک خارجی در تب جدید و بدون دسترسی به window.opener
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer nofollow" },
    }),
  },
  // محتوای تگ حذف‌شده هم باید برود، نه اینکه به‌صورت متن بیرون بیفتد
  nonTextTags: ["style", "script", "textarea", "option", "noscript", "iframe", "object", "embed", "svg", "math"],
  disallowedTagsMode: "discard",
};

/** فقط تگ‌ها، صفات و استایل‌های سفیدلیست‌شده باقی می‌مانند. */
export function sanitizeHtml(html: string): string {
  return sanitize(html, OPTIONS);
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
