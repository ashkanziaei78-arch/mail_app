/**
 * نشانی پایهٔ سامانه برای ساختن لینک‌هایی که بیرون فرستاده می‌شوند (پیامک، بله).
 *
 * چرا این فایل هست: پیامک‌های محیط تولید با لینک http://localhost:3000 بیرون
 * می‌رفت، چون APP_URL روی ورسل تنظیم نشده بود و مقدار پیش‌فرضِ توسعه می‌ماند.
 * حالا اگر APP_URL نباشد، از نشانی دامنهٔ تولیدِ خود ورسل استفاده می‌شود و فقط
 * در نبود هر دو به localhost می‌رسیم (یعنی واقعاً روی ماشین خودمان هستیم).
 */
export function appBaseUrl(): string {
  const explicit = process.env.APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  // ورسل این را روی همه استقرارها برابر دامنهٔ تولید پروژه می‌گذارد
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production) return `https://${production.replace(/\/$/, "")}`;

  const deployment = process.env.VERCEL_URL;
  if (deployment) return `https://${deployment.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}
