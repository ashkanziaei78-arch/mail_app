import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import ResetClient from "./reset-client";

export const metadata: Metadata = { title: "بازیابی گذرواژه" };
export const dynamic = "force-dynamic";

export default async function ResetPage() {
  if (await currentUser()) redirect("/dashboard");
  return (
    <main id="main" className="grid min-h-dvh place-items-center p-6">
      <ResetClient />
    </main>
  );
}
