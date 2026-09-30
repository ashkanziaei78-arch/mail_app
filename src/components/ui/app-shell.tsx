"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Contact, Tags, FileImage, Mail, PenLine, Link2, GraduationCap,
  MessageSquare, BarChart3, Users, ShieldCheck, Moon, Sun, LogOut, Menu, X, KeyRound, ChevronLeft, GitBranch,
} from "lucide-react";
import type { PermissionCode } from "@/lib/rbac";
import InboxWatcher from "./inbox-watcher";

export type NavItem = {
  href: string;
  label: string;
  /** نام کوتاه برای نوار پایین موبایل؛ نام بلند آنجا جا نمی‌شود. */
  short?: string;
  icon: keyof typeof ICONS;
  permission?: PermissionCode;
};

const ICONS = {
  LayoutDashboard, Contact, Tags, FileImage, Mail, PenLine, Link2, GraduationCap,
  MessageSquare, BarChart3, Users, ShieldCheck, GitBranch,
};

/**
 * منو در سه دسته.
 *
 * «روزمره» چیزی است که کاربر عادی هر روز با آن کار دارد؛ «سازمان» کارهای مدیر
 * است. هر آیتمِ مدیریتی یک permission دارد و برای کسی که آن را ندارد اصلاً رندر
 * نمی‌شود — نه اینکه غیرفعال دیده شود. کاربر عادی در عمل فقط چهار گزینه می‌بیند.
 */
export const NAV: Array<{ group: string; items: NavItem[] }> = [
  {
    group: "روزمره",
    items: [
      { href: "/dashboard", label: "داشبورد", icon: "LayoutDashboard" },
      { href: "/campaigns/new", label: "نامه جدید", short: "نامه نو", icon: "PenLine", permission: "campaigns.write" },
      { href: "/campaigns", label: "نامه‌های من", short: "نامه‌ها", icon: "Mail", permission: "campaigns.read" },
      { href: "/contacts", label: "دفترچه مخاطبین", short: "مخاطبین", icon: "Contact", permission: "contacts.read" },
      { href: "/approvals", label: "کارتابل تأیید", short: "تأیید", icon: "ShieldCheck", permission: "campaigns.approve" },
      { href: "/help", label: "آموزش تصویری", short: "آموزش", icon: "GraduationCap" },
    ],
  },
  {
    group: "ابزارها",
    items: [
      // کوتاه‌کننده لینک از منو برداشته شد: کوتاه‌سازی هنگام ارسال پیامک خودکار
      // انجام می‌شود و کسی لازم نیست دستی این کار را بکند. صفحه‌اش سر جایش
      // مانده (/tools/short-links) برای دیدن آمار کلیک لینک‌های ساخته‌شده.
      { href: "/reports", label: "گزارش‌ها", icon: "BarChart3", permission: "reports.read" },
    ],
  },
  {
    group: "سازمان",
    items: [
      { href: "/letterheads", label: "سربرگ و قالب", icon: "FileImage", permission: "letterheads.write" },
      { href: "/tags", label: "برچسب و گروه", icon: "Tags", permission: "tags.write" },
      { href: "/settings/users", label: "کاربران", icon: "Users", permission: "users.manage" },
      { href: "/settings/workflow", label: "سمت و گردش تأیید", icon: "GitBranch", permission: "users.manage" },
      { href: "/settings/access", label: "دسترسی‌ها", icon: "ShieldCheck", permission: "users.manage" },
      { href: "/settings/branding", label: "نشان و بنرها", icon: "FileImage", permission: "users.manage" },
      { href: "/settings/sms", label: "درگاه پیامک", icon: "MessageSquare", permission: "sms.settings" },
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

/** مسیر جاری را به «سازمان ‹ بخش» تبدیل می‌کند. */
function useBreadcrumb(pathname: string) {
  const all = NAV.flatMap((section) => section.items);
  const exact = all.find((item) => item.href === pathname);
  if (exact) return exact.href === "/dashboard" ? [] : [exact.label];
  const parent = all
    .filter((item) => item.href !== "/dashboard" && pathname.startsWith(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (pathname.startsWith("/account/password")) return ["امنیت حساب", "تغییر گذرواژه"];
  if (pathname.startsWith("/account/security")) return ["امنیت حساب"];
  return parent ? [parent.label, "جزئیات"] : [];
}

export default function AppShell({
  user, allowed, children,
}: {
  user: { fullName: string; roleLabel: string; organizationName: string; avatarSrc?: string | null; logoSrc?: string | null };
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

  const visibleSections = NAV
    .map((section) => ({ ...section, items: section.items.filter((i) => !i.permission || allowed.includes(i.permission)) }))
    .filter((section) => section.items.length > 0);

  /** آیتم‌های پرکاربرد برای نوار پایین موبایل — بیش از چهارتا روی صفحه کوچک جا نمی‌شود. */
  const quickItems = visibleSections.flatMap((s) => s.items).slice(0, 4);

  const sidebar = (
    <div className="flex h-full flex-col gap-4 bg-brand-900 p-3 text-white">
      <div className="flex items-center gap-3 px-2 pt-2">
        <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-600 text-lg font-bold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {user.logoSrc ? <img src={user.logoSrc} alt="" className="h-full w-full object-contain" /> : "م"}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-bold leading-tight">میلینگ سازمانی</span>
          <span className="block truncate text-[11px] text-brand-200">{user.organizationName}</span>
        </span>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto" aria-label="ناوبری اصلی">
        {visibleSections.map((section) => (
          <div key={section.group}>
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wide text-brand-200/80">{section.group}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
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
        ))}
      </nav>

      <div className="border-t border-white/15 pt-3">
        <div className="flex items-center gap-3 px-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-600 text-sm font-bold">
            {user.avatarSrc
              ? <img src={user.avatarSrc} alt="" className="h-full w-full object-cover" />
              : user.fullName.slice(0, 1)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{user.fullName}</span>
            <span className="block truncate text-[11px] text-brand-200">{user.roleLabel}</span>
          </span>
        </div>
        <Link href="/account/security" className="nav-item mt-2" aria-current={pathname.startsWith("/account") ? "page" : undefined}>
          <KeyRound className="h-[18px] w-[18px]" aria-hidden="true" />
          حساب و امضای من
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
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 md:block">{sidebar}</aside>

      {/* موبایل: کشو */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button className="absolute inset-0 bg-black/55" aria-label="بستن منو" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 right-0 w-[min(18rem,85vw)] shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b px-3 py-2 backdrop-blur md:px-4"
                style={{ background: "color-mix(in srgb, var(--bg) 85%, transparent)" }}>
          <button className="btn btn-sm md:hidden" onClick={() => setOpen(true)} aria-label="باز کردن منو" aria-expanded={open}>
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <nav aria-label="مسیر صفحه" className="flex min-w-0 items-center gap-1 text-sm">
            <Link href="/dashboard" className="hidden shrink-0 font-semibold hover:underline sm:inline">{user.organizationName}</Link>
            {crumbs.map((crumb, index) => (
              <span key={crumb} className="flex min-w-0 items-center gap-1">
                <ChevronLeft className="hidden h-3.5 w-3.5 shrink-0 sm:block" aria-hidden="true" style={{ color: "var(--muted)" }} />
                <span className="truncate" style={{ color: "var(--muted)" }}
                      aria-current={index === crumbs.length - 1 ? "page" : undefined}>
                  {crumb}
                </span>
              </span>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-2">
            {allowed.includes("campaigns.approve") && <InboxWatcher />}
            <ThemeToggle />
          </div>
        </header>

        {/* پایین صفحه روی موبایل: میان‌بر کارهای پرتکرار، بدون باز کردن کشو */}
        <main id="main" className="flex-1 p-3 pb-24 md:p-6 md:pb-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>

        <nav
          aria-label="میان‌بر"
          className="fixed inset-x-0 bottom-0 z-30 flex border-t md:hidden"
          style={{ background: "var(--surface)", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {quickItems.map((item) => {
            const Icon = ICONS[item.icon];
            const active = pathname === item.href;
            return (
              <Link
                key={item.href} href={item.href}
                // min-w-0 لازم است: بدون آن، آیتم flex کوچک‌تر از متنش نمی‌شود و
                // نوار از عرض صفحه می‌زند بیرون و کل صفحه افقی اسکرول می‌خورد.
                className="flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-[10px] font-semibold"
                aria-current={active ? "page" : undefined}
                style={{ color: active ? "var(--primary)" : "var(--muted)" }}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="w-full truncate px-0.5 text-center">{item.short ?? item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
