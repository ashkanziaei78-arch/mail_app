"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Contact, Tags, FileImage, FileText, Mail, PenLine,
  MessageSquare, BarChart3, Users, ShieldCheck, Moon, Sun, LogOut, Menu, X, KeyRound, ChevronLeft,
} from "lucide-react";
import type { PermissionCode } from "@/lib/rbac";

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; permission?: PermissionCode };

const ICONS = {
  LayoutDashboard, Contact, Tags, FileImage, FileText, Mail, PenLine,
  MessageSquare, BarChart3, Users, ShieldCheck,
};

export const NAV: Array<{ group: string; items: NavItem[] }> = [
  {
    group: "کارتابل",
    items: [
      { href: "/dashboard", label: "داشبورد", icon: "LayoutDashboard" },
      { href: "/contacts", label: "دفترچه مخاطبین", icon: "Contact", permission: "contacts.read" },
      { href: "/tags", label: "برچسب‌ها و گروه‌ها", icon: "Tags", permission: "contacts.read" },
      { href: "/letterheads", label: "سربرگ و قالب نامه", icon: "FileImage", permission: "campaigns.read" },
      { href: "/campaigns", label: "کمپین‌ها", icon: "Mail", permission: "campaigns.read" },
      { href: "/campaigns/new", label: "ساخت کمپین جدید", icon: "PenLine", permission: "campaigns.write" },
      { href: "/approvals", label: "تأیید نامه‌ها", icon: "ShieldCheck", permission: "campaigns.approve" },
    ],
  },
  {
    group: "مدیریت",
    items: [
      { href: "/settings/sms", label: "تنظیمات پیامک", icon: "MessageSquare", permission: "sms.settings" },
      { href: "/reports", label: "گزارش‌ها", icon: "BarChart3", permission: "reports.read" },
      { href: "/settings/users", label: "کاربران و نقش‌ها", icon: "Users", permission: "users.manage" },
    ],
  },
];

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as "light" | "dark") ?? "light");
  }, []);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("ms-theme", next); } catch { /* حالت خصوصی مرورگر */ }
    setTheme(next);
  }
  return (
    <button onClick={toggle} className="btn btn-sm" aria-label={theme === "dark" ? "تم روشن" : "تم تاریک"}>
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

/** مسیر جاری را به «داشبورد ‹ بخش» تبدیل می‌کند (قاعده breadcrumb-web). */
function useBreadcrumb(pathname: string) {
  const all = NAV.flatMap((section) => section.items);
  const exact = all.find((item) => item.href === pathname);
  if (exact) return exact.href === "/dashboard" ? [] : [exact.label];
  const parent = all
    .filter((item) => item.href !== "/dashboard" && pathname.startsWith(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (pathname.startsWith("/account/password")) return ["حساب کاربری", "تغییر گذرواژه"];
  return parent ? [parent.label, "جزئیات"] : [];
}

export default function AppShell({
  user, allowed, children,
}: {
  user: { fullName: string; roleLabel: string; organizationName: string };
  allowed: string[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const crumbs = useBreadcrumb(pathname);

  useEffect(() => { setOpen(false); }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col gap-4 bg-brand-900 p-3 text-white">
      <div className="flex items-center gap-3 px-2 pt-2">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-lg font-bold">م</span>
        <span>
          <span className="block font-bold leading-tight">میلینگ سازمانی</span>
          <span className="block text-[11px] text-brand-200">سامانه مکاتبات و ارتباط با مخاطبین</span>
        </span>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto" aria-label="ناوبری اصلی">
        {NAV.map((section) => {
          const items = section.items.filter((i) => !i.permission || allowed.includes(i.permission));
          if (!items.length) return null;
          return (
            <div key={section.group}>
              <p className="px-3 pb-1 text-[11px] font-bold text-brand-200">{section.group}</p>
              <ul className="space-y-1">
                {items.map((item) => {
                  const Icon = ICONS[item.icon];
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link href={item.href} className="nav-item" aria-current={active ? "page" : undefined}>
                        <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/15 pt-3">
        <div className="flex items-center gap-3 px-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold">
            {user.fullName.slice(0, 1)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{user.fullName}</span>
            <span className="block truncate text-[11px] text-brand-200">{user.roleLabel} — {user.organizationName}</span>
          </span>
        </div>
        <Link href="/account/password" className="nav-item mt-2" aria-current={pathname === "/account/password" ? "page" : undefined}>
          <KeyRound className="h-[18px] w-[18px]" aria-hidden="true" />
          تغییر گذرواژه
        </Link>
        {/* خروج، عمداً از آیتم‌های ناوبری جدا شده است */}
        <button onClick={logout} className="nav-item w-full text-right">
          <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
          خروج از حساب
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh md:flex">
      {/* دسکتاپ: سایدبار ثابت */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 md:block">{sidebar}</aside>

      {/* موبایل: کشو */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button className="absolute inset-0 bg-black/55" aria-label="بستن منو" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 right-0 w-72 shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b px-4 py-2 backdrop-blur"
                style={{ background: "color-mix(in srgb, var(--bg) 85%, transparent)" }}>
          <button className="btn btn-sm md:hidden" onClick={() => setOpen(true)} aria-label="باز کردن منو" aria-expanded={open}>
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <nav aria-label="مسیر صفحه" className="flex min-w-0 items-center gap-1 text-sm">
            <Link href="/dashboard" className="shrink-0 font-semibold hover:underline">{user.organizationName}</Link>
            {crumbs.map((crumb, index) => (
              <span key={crumb} className="flex min-w-0 items-center gap-1">
                <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" style={{ color: "var(--muted)" }} />
                <span className={index === crumbs.length - 1 ? "truncate" : "truncate"} style={{ color: "var(--muted)" }}
                      aria-current={index === crumbs.length - 1 ? "page" : undefined}>
                  {crumb}
                </span>
              </span>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        <main id="main" className="flex-1 p-4 md:p-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
