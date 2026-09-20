"use client";

import { Printer } from "lucide-react";

/**
 * ponytail: خروجی PDF از طریق چاپ مرورگر (Save as PDF) گرفته می‌شود.
 * دلیل: رندر فارسی/RTL در مرورگر بی‌نقص است و puppeteer + فونت‌های فارسی حدود ۳۰۰ مگابایت به ایمیج اضافه می‌کرد.
 * اگر روزی تولید PDF سمت سرور لازم شد (مثلاً بایگانی خودکار)، همین صفحه را با headless Chromium چاپ کنید.
 */
export default function PrintButton() {
  return (
    <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
      <Printer className="h-4 w-4" />
      چاپ / ذخیره PDF
    </button>
  );
}
