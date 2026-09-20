// ponytail: تاریخ شمسی با Intl استاندارد Node — بدون وابستگی تقویم.
const FA_DATE = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric", month: "2-digit", day: "2-digit",
});
const FA_DATETIME = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
});

export function faDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return FA_DATE.format(new Date(value));
}

export function faDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return FA_DATETIME.format(new Date(value));
}

export function faNumber(value: number | string): string {
  return Number(value).toLocaleString("fa-IR");
}
