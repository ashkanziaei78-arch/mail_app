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

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "مدیر کل سامانه",
  ORG_ADMIN: "مدیر سازمان",
  DEPT_ADMIN: "مدیر واحد",
  APPROVER: "ناظر / تأییدکننده",
  USER: "کاربر عادی",
};
