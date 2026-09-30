import type { UserRole } from "@prisma/client";

/** کدهای مجوز — همان‌ها در جدول permissions هم seed می‌شوند */
export const PERMISSIONS = [
  "contacts.read", "contacts.write", "contacts.delete", "contacts.read_all_private",
  /** افزودن/ویرایش/حذف مخاطب دفترچه عمومی — فقط مدیر. کاربر عادی عمومی‌ها را می‌بیند ولی دست نمی‌زند. */
  "contacts.manage_public",
  "tags.write", "groups.write",
  "letterheads.write", "templates.write",
  "campaigns.read", "campaigns.write", "campaigns.approve", "campaigns.send",
  "sms.settings", "reports.read", "users.manage", "orgs.manage",
] as const;

export type PermissionCode = (typeof PERMISSIONS)[number];

const MATRIX: Record<UserRole, PermissionCode[] | "*"> = {
  SUPER_ADMIN: "*",
  ORG_ADMIN: [
    "contacts.read", "contacts.write", "contacts.delete", "contacts.read_all_private",
    "contacts.manage_public", "tags.write", "groups.write", "letterheads.write", "templates.write",
    "campaigns.read", "campaigns.write", "campaigns.approve", "campaigns.send",
    "sms.settings", "reports.read", "users.manage",
  ],
  // مدیر واحد نامه می‌سازد و می‌فرستد، ولی برچسب و دفترچه عمومی سازمان را تغییر نمی‌دهد.
  DEPT_ADMIN: [
    "contacts.read", "contacts.write", "contacts.delete",
    "campaigns.read", "campaigns.write", "campaigns.send", "reports.read",
  ],
  APPROVER: ["contacts.read", "campaigns.read", "campaigns.approve", "reports.read"],
  USER: ["contacts.read", "contacts.write", "campaigns.read", "campaigns.write"],
};

export function can(role: UserRole, permission: PermissionCode): boolean {
  const allowed = MATRIX[role];
  return allowed === "*" || allowed.includes(permission);
}

/** مجوزهای پیش‌فرض یک نقش، به‌صورت فهرست. */
export function rolePermissions(role: UserRole): PermissionCode[] {
  return PERMISSIONS.filter((p) => can(role, p));
}

/**
 * مجوزهای مؤثر یک کاربر: پیش‌فرض نقش، به‌علاوه/منهای استثناهایی که مدیر برای
 * همان شخص ثبت کرده است. این‌طور مدیر می‌تواند بدون عوض‌کردن نقش، یک آیتم منو
 * را برای یک نفر باز یا بسته کند.
 */
export function effectivePermissions(
  role: UserRole,
  overrides: Array<{ code: string; granted: boolean }>,
): PermissionCode[] {
  const set = new Set<string>(rolePermissions(role));
  for (const override of overrides) {
    if (override.granted) set.add(override.code);
    else set.delete(override.code);
  }
  return PERMISSIONS.filter((p) => set.has(p));
}

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "مدیر کل سامانه",
  ORG_ADMIN: "مدیر سازمان",
  DEPT_ADMIN: "مدیر واحد",
  APPROVER: "ناظر / تأییدکننده",
  USER: "کاربر عادی",
};

/**
 * برچسب فارسی هر مجوز، برای صفحه «دسترسی‌ها».
 * همان فهرستی است که seed در جدول Permission می‌نویسد.
 */
export const PERMISSION_LABELS: Record<PermissionCode, string> = {
  "contacts.read": "مشاهده مخاطبین",
  "contacts.write": "ثبت و ویرایش مخاطب",
  "contacts.delete": "حذف مخاطب",
  "contacts.read_all_private": "مشاهده دفترچه‌های خصوصی",
  "contacts.manage_public": "ویرایش دفترچه عمومی",
  "tags.write": "مدیریت برچسب‌ها",
  "groups.write": "مدیریت گروه‌ها",
  "letterheads.write": "مدیریت سربرگ‌ها",
  "templates.write": "مدیریت قالب نامه",
  "campaigns.read": "مشاهده نامه‌ها",
  "campaigns.write": "ساخت و ویرایش نامه",
  "campaigns.approve": "تأیید نامه (کارتابل)",
  "campaigns.send": "ارسال پیامک",
  "sms.settings": "درگاه پیامک و بله",
  "reports.read": "گزارش‌ها",
  "users.manage": "کاربران، سمت‌ها و دسترسی‌ها",
  "orgs.manage": "مدیریت سازمان‌ها",
};

/** گروه‌بندی مجوزها برای نمایش در صفحه دسترسی‌ها. */
export const PERMISSION_GROUPS: Array<{ title: string; codes: PermissionCode[] }> = [
  { title: "مخاطبین", codes: ["contacts.read", "contacts.write", "contacts.delete", "contacts.manage_public", "contacts.read_all_private"] },
  { title: "نامه‌ها", codes: ["campaigns.read", "campaigns.write", "campaigns.approve", "campaigns.send"] },
  { title: "محتوا", codes: ["letterheads.write", "templates.write", "tags.write", "groups.write"] },
  { title: "سازمان", codes: ["reports.read", "sms.settings", "users.manage"] },
];
