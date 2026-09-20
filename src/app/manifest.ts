import type { MetadataRoute } from "next";

/** PWA — نصب روی اندروید/کروم و Add to Home Screen در iOS */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "سامانه میلینگ سازمانی",
    short_name: "میلینگ",
    description: "سامانه مکاتبات سازمانی و ارتباط با مخاطبین",
    lang: "fa",
    dir: "rtl",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f4f6fa",
    theme_color: "#0f2547",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
