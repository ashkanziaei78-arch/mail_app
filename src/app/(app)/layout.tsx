import AppShell from "@/components/ui/app-shell";
import { requirePage } from "@/lib/auth";
import { PERMISSIONS, ROLE_LABELS, can } from "@/lib/rbac";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePage();
  const allowed = PERMISSIONS.filter((p) => can(user.role, p));
  return (
    <AppShell
      user={{ fullName: user.fullName, roleLabel: ROLE_LABELS[user.role], organizationName: user.organizationName }}
      allowed={allowed}
    >
      {children}
    </AppShell>
  );
}
