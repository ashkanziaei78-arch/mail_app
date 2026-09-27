import { z } from "zod";

export const contactInput = z.object({
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
  firstName: z.string().trim().min(1, "نام الزامی است.").max(80),
  lastName: z.string().trim().min(1, "نام خانوادگی الزامی است.").max(80),
  formalTitle: z.string().trim().max(40).optional().nullable(),
  mobilePhone: z.string().trim().max(20).optional().nullable(),
  landlinePhone: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().email("ایمیل معتبر نیست.").max(200).optional().nullable().or(z.literal("")),
  province: z.string().trim().max(60).optional().nullable(),
  city: z.string().trim().max(60).optional().nullable(),
  address: z.string().trim().max(400).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  smsConsent: z.boolean().default(true),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  organizationName: z.string().trim().max(160).optional().nullable(),
  jobTitle: z.string().trim().max(120).optional().nullable(),
  jobCategory: z.string().trim().max(120).optional().nullable(),
  tagIds: z.array(z.string().uuid()).max(50).default([]),
});

export type ContactInput = z.infer<typeof contactInput>;

export const FIELD_TYPES = [
  { value: "TEXT", label: "متن یک‌خطی", hint: "مثل شماره نامه یا نام واحد" },
  { value: "TEXTAREA", label: "یادداشت چندخطی", hint: "متن ساده و بدون قالب‌بندی" },
  { value: "RICH_TEXT", label: "متن با قالب‌بندی", hint: "پررنگ، فهرست، جدول" },
  { value: "DATE", label: "تاریخ شمسی", hint: "با تقویم انتخاب می‌شود" },
  { value: "NUMBER", label: "عدد", hint: "" },
  { value: "SELECT", label: "انتخاب از فهرست", hint: "گزینه‌ها را خودتان تعیین می‌کنید" },
  { value: "SIGNATURE", label: "امضای فرستنده", hint: "تصویر امضای کاربری که نامه را می‌سازد، خودکار در این کادر می‌نشیند" },
] as const;

export const FIELD_AREAS = [
  { value: "HEADER", label: "بالای نامه", hint: "کنار شماره و تاریخ" },
  { value: "BODY", label: "داخل متن", hint: "با {{فیلد:کلید}} در متن نامه درج می‌شود" },
  { value: "FOOTER", label: "پای نامه", hint: "کنار امضا" },
] as const;

export const letterheadFieldInput = z.object({
  /** کلید لاتین — در متن نامه به‌صورت {{فیلد:key}} استفاده می‌شود */
  key: z.string().trim().min(1, "کلید فیلد الزامی است.").max(40)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "کلید باید با حرف انگلیسی شروع شود و فقط حرف، رقم و _ داشته باشد."),
  label: z.string().trim().min(1, "برچسب فیلد الزامی است.").max(80),
  type: z.enum(["TEXT", "TEXTAREA", "RICH_TEXT", "DATE", "NUMBER", "SELECT", "SIGNATURE"]).default("TEXT"),
  area: z.enum(["HEADER", "BODY", "FOOTER"]).default("HEADER"),
  placeholder: z.string().trim().max(120).optional().nullable(),
  helpText: z.string().trim().max(200).optional().nullable(),
  required: z.boolean().default(false),
  defaultValue: z.string().trim().max(500).optional().nullable(),
  options: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  sortOrder: z.number().int().min(0).max(999).default(0),

  // جای کادر روی تصویر سربرگ، برحسب درصد — نه پیکسل، تا در هر اندازه‌ای سرِ جایش بماند.
  x: z.number().min(0).max(100).default(8),
  y: z.number().min(0).max(100).default(20),
  width: z.number().min(2).max(100).default(40),
  height: z.number().min(2).max(100).default(8),
  fontFamily: z.string().trim().max(60).default("Vazirmatn"),
  fontSize: z.number().int().min(6).max(96).default(14),
  fontWeight: z.enum(["300", "400", "500", "600", "700", "800"]).default("400"),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "رنگ باید کد هگز باشد.").default("#111827"),
  align: z.enum(["right", "center", "left", "justify"]).default("right"),
  lineHeight: z.number().min(1).max(3).default(1.8),
});

/** فونت‌هایی که در ویرایشگر سربرگ انتخاب‌شدنی‌اند. فونت‌های اختصاصی بعداً به این فهرست اضافه می‌شوند. */
export const LETTERHEAD_FONTS = [
  { value: "Vazirmatn", label: "وزیرمتن (پیش‌فرض)" },
  { value: "IRANSans", label: "ایران‌سنس" },
  { value: "IRANYekan", label: "ایران‌یکان" },
  { value: "BNazanin", label: "بی‌نازنین" },
  { value: "BTitr", label: "بی‌تیتر" },
  { value: "Tahoma", label: "تاهوما" },
] as const;

export const ALIGN_LABELS: Record<string, string> = {
  right: "راست‌چین",
  center: "وسط‌چین",
  left: "چپ‌چین",
  justify: "هم‌تراز",
};

/** ورودی کوتاه‌کننده لینک */
export const shortUrlInput = z.object({
  targetUrl: z.string().trim().url("نشانی معتبر نیست؛ باید با http:// یا https:// شروع شود.").max(2000),
  label: z.string().trim().max(80).optional().nullable(),
});

export type LetterheadFieldInput = z.infer<typeof letterheadFieldInput>;
