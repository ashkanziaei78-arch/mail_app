import type { Metadata } from "next";
import { requirePage } from "@/lib/auth";
import ChangePasswordForm from "./change-password-form";

export const metadata: Metadata = { title: "تغییر گذرواژه" };
export const dynamic = "force-dynamic";

export default async function ChangePasswordPage({ searchParams }: {
  searchParams: Promise<{ first?: string }>;
}) {
  await requirePage();
  const first = (await searchParams).first === "1";
  return <ChangePasswordForm firstLogin={first} />;
}
