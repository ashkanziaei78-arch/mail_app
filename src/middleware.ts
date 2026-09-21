import { NextResponse, type NextRequest } from "next/server";

/**
 * لایه اول دفاع، پیش از رسیدن به هر صفحه یا route handler:
 *  ۱) بررسی Origin برای درخواست‌های تغییردهنده (دفاع در عمق مقابل CSRF،
 *     در کنار SameSite=Strict روی کوکی نشست).
 *  ۲) هدرهای امنیتی، از جمله CSP با nonce تا اسکریپت درون‌خطی مهاجم اجرا نشود.
 */
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function middleware(request: NextRequest) {
  // وبهوک درگاه پیامک از مرورگر نمی‌آید و Origin ندارد؛ خودش با توکن مشترک
  // محافظت می‌شود، پس از بررسی Origin مستثناست.
  const isWebhook = request.nextUrl.pathname.startsWith("/api/sms/webhook");

  if (MUTATING.has(request.method) && !isWebhook) {
    const origin = request.headers.get("origin");
    // فرم‌های same-origin مرورگر همیشه Origin می‌فرستند؛ نبودش یعنی درخواست
    // غیرمرورگری است که برای APIهای نشست‌محور ما مجاز نیست.
    const expected = new URL(request.url).origin;
    const allowed = (process.env.APP_URL ?? expected).replace(/\/$/, "");
    if (!origin || (origin !== expected && origin !== allowed)) {
      return NextResponse.json(
        { ok: false, error: "منبع درخواست معتبر نیست. صفحه را تازه کنید و دوباره تلاش کنید." },
        { status: 403 },
      );
    }
  }

  const nonce = crypto.randomUUID().replace(/-/g, "");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // مسیر جاری را به Server Componentها می‌دهیم (usePathname فقط سمت کلاینت است)
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  const csp = [
    "default-src 'self'",
    // 'strict-dynamic' به اسکریپت‌های بارگذاری‌شده توسط اسکریپت مورد اعتماد Next اجازه می‌دهد؛
    // اسکریپت درون‌خطی بدون nonce (یعنی تزریق‌شده) اجرا نمی‌شود.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline'`,
    // Tailwind و استایل‌های درون‌خطی کامپوننت‌ها به inline نیاز دارند.
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",   // جلوگیری از clickjacking
    "base-uri 'none'",          // جلوگیری از ربودن مسیر اسکریپت‌ها با <base>
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("X-Robots-Tag", "noindex, nofollow"); // سامانه داخلی است؛ ایندکس نشود
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  return response;
}

export const config = {
  matcher: [
    // فایل‌های ثابت و آیکون‌ها از این مسیر خارج‌اند
    "/((?!_next/static|_next/image|favicon.ico|icons/|fonts/|uploads/|sw.js).*)",
  ],
};
