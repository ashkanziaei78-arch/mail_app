import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false, // نسخه فریم‌ورک را لو ندهیم
  async headers() {
    return [
      {
        // فایل‌های آپلودی از matcher میان‌افزار بیرون‌اند، پس هدرهایشان اینجا ست می‌شود.
        // nosniff مانع تفسیر یک فایل آپلودی به‌عنوان HTML/اسکریپت می‌شود.
        source: "/uploads/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Security-Policy", value: "default-src 'none'; img-src 'self'; sandbox" },
          { key: "Content-Disposition", value: "inline" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
