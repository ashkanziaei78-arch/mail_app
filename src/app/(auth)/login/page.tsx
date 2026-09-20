import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import LoginClient from "./login-client";

export const metadata: Metadata = { title: "ورود" };

export default async function LoginPage() {
  if (await currentUser()) redirect("/dashboard");
  return <LoginClient heroImageSrc={process.env.NEXT_PUBLIC_HERO_IMAGE || "/hero.png"} />;
}
