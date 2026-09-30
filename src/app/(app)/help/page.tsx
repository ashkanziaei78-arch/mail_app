import type { Metadata } from "next";
import { allows, requirePage } from "@/lib/auth";
import { type PermissionCode } from "@/lib/rbac";
import { TUTORIALS } from "@/lib/tutorials";
import HelpClient from "./help-client";

export const metadata: Metadata = { title: "آموزش تصویری" };

export default async function HelpPage() {
  const user = await requirePage();
  // درسی که به بخش بی‌دسترسیِ کاربر مربوط است نشان داده نمی‌شود؛ آموزشِ صفحه‌ای
  // که اصلاً در منویش نیست فقط گیجش می‌کند.
  const tutorials = TUTORIALS.filter(
    (t) => !t.permission || allows(user, t.permission as PermissionCode),
  );
  return <HelpClient tutorials={tutorials} />;
}
