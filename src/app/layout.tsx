import type { Metadata, Viewport } from "next";
import "./globals.css";
import RegisterSW from "@/components/ui/register-sw";

export const metadata: Metadata = {
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        {/* ponytail: فونت از CDN. برای استقرار آفلاین، فایل‌های woff2 را در public/fonts بگذارید و این لینک را جایگزین کنید. */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
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
