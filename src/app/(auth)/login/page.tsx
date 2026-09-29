import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import LoginClient from "./login-client";

export const metadata: Metadata = { title: "ورود" };

export default async function LoginPage() {
  if (await currentUser()) redirect("/dashboard");
  // تصویر پیش‌فرض از Unsplash (رایگان، با ذکر منبع). سازمان می‌تواند با
  // NEXT_PUBLIC_HERO_IMAGE عکس ساختمان خودش را جایگزین کند.
  const hero =
    process.env.NEXT_PUBLIC_HERO_IMAGE ||
    "https://images.unsplash.com/photo-1763568946839-3599812c50ec?auto=format&fit=crop&w=1400&q=70";
  return <LoginClient heroImageSrc={hero} />;
}
