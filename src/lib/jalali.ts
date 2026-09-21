/**
 * تقویم شمسی (هجری خورشیدی) — تبدیل دوطرفه، بدون وابستگی.
 *
 * نمایش با Intl هم ممکن بود، ولی Intl فقط «قالب‌بندی» می‌کند و «تجزیه» نمی‌کند؛
 * برای تقویم انتخاب تاریخ به تبدیل واقعی در هر دو جهت نیاز داریم.
 * الگوریتم: تبدیل از/به شماره روز جولیَن (JDN).
 */

export const FA_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

/** روزهای هفته از شنبه (شروع هفته در تقویم ایرانی) */
export const FA_WEEKDAYS = ["شنبه", "یک‌شنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];
export const FA_WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export type JalaliDate = { year: number; month: number; day: number };

/**
 * تقسیم و باقیمانده با قطع به سمت صفر (نه floor).
 * الگوریتم جلالی روی همین قرارداد بنا شده؛ با Math.floor نتیجه برای ورودی‌های
 * منفی یک روز جابه‌جا می‌شود و تبدیل کل تقویم خراب می‌گردد.
 */
function div(a: number, b: number) {
  return Math.trunc(a / b);
}

function mod(a: number, b: number) {
  return a - Math.trunc(a / b) * b;
}

/**
 * نقاط شکست دوره‌های ۳۳ساله تقویم جلالی (الگوریتم Borkowski).
 *
 * قاعده حسابی ۲۸۲۰ساله که در بسیاری از کتابخانه‌ها هست، در برخی سال‌ها
 * (مثلاً ۱۴۰۳) کبیسه را اشتباه می‌گیرد و یک روز اختلاف می‌سازد. این جدول با
 * تقویم رسمی ایران و با پیاده‌سازی ICU (که مرورگر و Node استفاده می‌کنند)
 * برای سال‌های ۱۱۷۸ تا ۱۶۳۳ دقیقاً یکی است — تست آن در selftest هست.
 */
const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181,
  1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178,
];

function jalaliCalendarInfo(jalaliYear: number): { leap: number; gregorianYear: number; march: number } {
  const gregorianYear = jalaliYear + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jump = 0;

  if (jalaliYear < jp || jalaliYear >= BREAKS[BREAKS.length - 1]) {
    throw new Error(`سال شمسی خارج از محدوده پشتیبانی‌شده: ${jalaliYear}`);
  }

  for (let i = 1; i < BREAKS.length; i++) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jalaliYear < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  let n = jalaliYear - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gregorianYear, 4) - div((div(gregorianYear, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;

  return { leap, gregorianYear, march };
}

/** میلادی → شماره روز جولیَن */
function gregorianToJdn(year: number, month: number, day: number): number {
  let jdn =
    div((year + div(month - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(month + 9, 12) + 2, 5) +
    day -
    34840408;
  jdn = jdn - div(div(year + 100100 + div(month - 8, 6), 100) * 3, 4) + 752;
  return jdn;
}

/** شماره روز جولیَن → میلادی */
function jdnToGregorian(jdn: number): { year: number; month: number; day: number } {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const day = div(mod(i, 153), 5) + 1;
  const month = mod(div(i, 153), 12) + 1;
  const year = div(j, 1461) - 100100 + div(8 - month, 6);
  return { year, month, day };
}

function jalaliToJdn(year: number, month: number, day: number): number {
  const info = jalaliCalendarInfo(year);
  return gregorianToJdn(info.gregorianYear, 3, info.march) + (month - 1) * 31 - div(month, 7) * (month - 7) + day - 1;
}

export function jalaliToGregorian(j: JalaliDate): { year: number; month: number; day: number } {
  return jdnToGregorian(jalaliToJdn(j.year, j.month, j.day));
}

export function gregorianToJalali(date: Date): JalaliDate {
  const jdn = gregorianToJdn(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const gregorianYear = jdnToGregorian(jdn).year;
  let jalaliYear = gregorianYear - 621;
  const info = jalaliCalendarInfo(jalaliYear);
  const firstDayJdn = gregorianToJdn(info.gregorianYear, 3, info.march);

  let dayOfYear = jdn - firstDayJdn;
  if (dayOfYear >= 0) {
    if (dayOfYear <= 185) {
      return { year: jalaliYear, month: 1 + div(dayOfYear, 31), day: mod(dayOfYear, 31) + 1 };
    }
    dayOfYear -= 186;
  } else {
    // کبیسه‌بودن بر اساس سالِ پیش از کاهش سنجیده می‌شود، نه سال جدید
    jalaliYear -= 1;
    dayOfYear += 179;
    if (info.leap === 1) dayOfYear += 1;
  }
  return { year: jalaliYear, month: 7 + div(dayOfYear, 30), day: mod(dayOfYear, 30) + 1 };
}

export function isJalaliLeapYear(year: number): boolean {
  return jalaliCalendarInfo(year).leap === 0;
}

export function jalaliMonthLength(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return isJalaliLeapYear(year) ? 30 : 29;
}

/** شماره روز هفته با شنبه = ۰ */
export function jalaliWeekday(date: Date): number {
  return (date.getDay() + 1) % 7;
}

// ---------------------------------------------------------
// قالب‌بندی و تجزیه
// ---------------------------------------------------------

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function toFaDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

export function toEnDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ۱۴۰۴/۰۶/۲۹ */
export function faDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const j = gregorianToJalali(new Date(value));
  return toFaDigits(`${j.year}/${pad(j.month)}/${pad(j.day)}`);
}

/** ۲۹ شهریور ۱۴۰۴ */
export function faDateLong(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const j = gregorianToJalali(new Date(value));
  return `${toFaDigits(j.day)} ${FA_MONTHS[j.month - 1]} ${toFaDigits(j.year)}`;
}

/** ۱۴۰۴/۰۶/۲۹ ۱۴:۳۰ */
export function faDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return `${faDate(date)} ${toFaDigits(`${pad(date.getHours())}:${pad(date.getMinutes())}`)}`;
}

/** «۳ ساعت پیش» — برای ستون‌های رهگیری خواناتر از تاریخ کامل است. */
export function faRelative(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "همین الان";
  if (minutes < 60) return `${toFaDigits(minutes)} دقیقه پیش`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${toFaDigits(hours)} ساعت پیش`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${toFaDigits(days)} روز پیش`;
  return faDate(value);
}

export function faNumber(value: number | string): string {
  return Number(value).toLocaleString("fa-IR");
}

/** ۱۴۰۴/۰۶/۲۹ یا 1404-06-29 → Date. ورودی نامعتبر ⇒ null */
export function parseJalali(input: string): Date | null {
  const parts = toEnDigits(input.trim()).split(/[/\-.]/).map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n))) return null;
  const [year, month, day] = parts;
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > jalaliMonthLength(year, month)) return null;
  const g = jalaliToGregorian({ year, month, day });
  return new Date(g.year, g.month - 1, g.day);
}

/** Date → «۱۴۰۴/۰۶/۲۹» با ارقام لاتین، برای مقدار input */
export function formatJalaliInput(date: Date | null): string {
  if (!date) return "";
  const j = gregorianToJalali(date);
  return `${j.year}/${pad(j.month)}/${pad(j.day)}`;
}
