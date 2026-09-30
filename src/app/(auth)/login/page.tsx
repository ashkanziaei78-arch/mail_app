import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseBanners } from "@/lib/banners";
import LoginClient, { type Slide } from "./login-client";
import ThemeStyle from "@/components/ui/theme-style";

export const metadata: Metadata = { title: "ورود" };

export default async function LoginPage() {
  if (await currentUser()) redirect("/dashboard");
  // بنرهای سازمان (تنظیمات ← نشان و بنرها). اگر بنری ثبت نشده باشد، تصویر
  // پیش‌فرض از Unsplash نشان داده می‌شود تا صفحه خام نماند.
  const organization = await prisma.organization.findFirst({
    where: { status: "ACTIVE" },
    select: { bannersJson: true, themeId: true },
  });
  const settings = parseBanners(organization?.bannersJson);

  const slides: Slide[] = settings.items.length
    ? settings.items.map((b) => ({ src: b.src, caption: b.caption || "سامانه میلینگ سازمانی" }))
    : [{
        src:
          process.env.NEXT_PUBLIC_HERO_IMAGE ||
          "https://images.unsplash.com/photo-1621831337128-35676ca30868?auto=format&fit=crop&w=1400&q=70",
        caption: "یک نامه، هزار مخاطب — هرکدام با نام خودش.",
      }];

  return (
    <>
      <ThemeStyle themeId={organization?.themeId} />
      <LoginClient slides={slides} overlay={settings.overlay} seconds={settings.seconds} />
    </>
  );
}
