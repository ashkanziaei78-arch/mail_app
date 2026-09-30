import type { Prisma } from "@prisma/client";
import { allows, type CurrentUser } from "./auth";

/**
 * دفترچه عمومی سازمان برای همه کاربران آن سازمان قابل مشاهده است،
 * دفترچه خصوصی فقط برای مالک (و مدیرانی که مجوز contacts.read_all_private دارند).
 */
export function contactScope(user: CurrentUser): Prisma.ContactWhereInput {
  const base: Prisma.ContactWhereInput = { organizationId: user.organizationId, deletedAt: null };
  if (allows(user, "contacts.read_all_private")) return base;
  return { ...base, OR: [{ visibility: "PUBLIC" }, { ownerUserId: user.id }] };
}

/**
 * ویرایش/حذف مخاطب.
 * دفترچه عمومی را همه می‌بینند ولی فقط مدیر (contacts.manage_public) تغییرش می‌دهد؛
 * دفترچه خصوصی را مالکش می‌چرخاند.
 */
export function canEditContact(
  user: CurrentUser,
  contact: { visibility: string; ownerUserId: string | null },
): boolean {
  if (contact.visibility === "PUBLIC") return allows(user, "contacts.manage_public");
  if (allows(user, "contacts.read_all_private")) return true;
  return contact.ownerUserId === user.id;
}

/** آیا این کاربر اجازه دارد مخاطب تازه با این نوع دفترچه بسازد؟ */
export function canCreateContact(user: CurrentUser, visibility: string): boolean {
  return visibility === "PUBLIC"
    ? allows(user, "contacts.manage_public")
    : allows(user, "contacts.write");
}
