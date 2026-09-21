import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AppShell from "@/components/ui/app-shell";
import { ToastProvider } from "@/components/ui/toast";
import { prisma } from "@/lib/db";
import { requirePage } from "@/lib/auth";
import { PERMISSIONS, ROLE_LABELS, can } from "@/lib/rbac";

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

  const allowed = PERMISSIONS.filter((p) => can(user.role, p));
  return (
    <AppShell
      user={{ fullName: user.fullName, roleLabel: ROLE_LABELS[user.role], organizationName: user.organizationName }}
      allowed={allowed}
    >
      <ToastProvider>{children}</ToastProvider>
    </AppShell>
  );
}
