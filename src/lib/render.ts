import sanitize from "sanitize-html";

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
