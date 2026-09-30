import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AppShell from "@/components/ui/app-shell";
import { ToastProvider } from "@/components/ui/toast";
import { prisma } from "@/lib/db";
import { requirePage } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/rbac";
import { avatarSrc } from "@/lib/avatars";
import { hasApprovalDuty } from "@/lib/workflow";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePage();

  // گذرواژه اولیه‌ای که مدیر ساخته باید در نخستین ورود عوض شود.
  // خودِ صفحه تغییر گذرواژه مستثناست وگرنه حلقه ریدایرکت می‌شد.
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (!pathname.startsWith("/account/password")) {
    const { mustChangePassword } = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { mustChangePassword: true },
    });
    if (mustChangePassword) redirect("/account/password?first=1");
  }

  const [{ avatarPath }, organization] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { avatarPath: true } }),
    prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId }, select: { logoPath: true } }),
  ]);

  // کارتابل و زنگ اعلان به «سمتِ دارای حق تأیید» هم باز می‌شود، نه فقط نقش‌هایی
  // که مجوز عمومی تأیید دارند؛ گردش کار روی سمت تعریف شده است.
  const approvalDuty = await hasApprovalDuty(user);
  const allowed = approvalDuty && !user.permissions.includes("campaigns.approve")
    ? [...user.permissions, "campaigns.approve" as const]
    : user.permissions;
  return (
    <AppShell
      user={{
        fullName: user.fullName,
        roleLabel: ROLE_LABELS[user.role],
        organizationName: user.organizationName,
        avatarSrc: avatarSrc(avatarPath),
        logoSrc: organization.logoPath,
      }}
      allowed={allowed}
    >
      <ToastProvider>{children}</ToastProvider>
    </AppShell>
  );
}
