import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import RegisterSW from "@/components/ui/register-sw";
import { prisma } from "@/lib/db";

/**
 * نشان تب مرورگر از تنظیمات سازمان خوانده می‌شود؛ اگر سازمان نشان نگذاشته باشد،
 * همان نشان پیش‌فرض سامانه می‌ماند. خطای پایگاه داده نباید صفحه را بشکند، پس
 * بی‌سروصدا به پیش‌فرض برمی‌گردیم.
 */
async function organizationFavicon(): Promise<string | null> {
  try {
    const organization = await prisma.organization.findFirst({
      where: { status: "ACTIVE", faviconPath: { not: null } },
      select: { faviconPath: true },
    });
    return organization?.faviconPath ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const favicon = await organizationFavicon();
  return favicon ? { ...metadata, icons: { icon: favicon, apple: favicon } } : metadata;
}

const metadata: Metadata = {
  title: { default: "میلینگ سازمانی", template: "%s — میلینگ سازمانی" },
  description: "سامانه مکاتبات سازمانی و ارتباط با مخاطبین",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "میلینگ" },
  formatDetection: { telephone: false },
  icons: { icon: "/icon.svg", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f2547" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

/** تم را پیش از رنگ‌آمیزی اولیه اعمال می‌کند تا پرش رنگ نداشته باشیم. */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("ms-theme");if(!t)t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        {/* فونت محلی است؛ preload تا متن فارسی بدون پرش رندر شود */}
        <link rel="preload" href="/fonts/vazirmatn-variable.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:right-3 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white">
          پرش به محتوای اصلی
        </a>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
