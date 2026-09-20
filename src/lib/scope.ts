import type { Prisma } from "@prisma/client";
import type { CurrentUser } from "./auth";
import { can } from "./rbac";

/**
 * دفترچه عمومی سازمان برای همه کاربران آن سازمان قابل مشاهده است،
 * دفترچه خصوصی فقط برای مالک (و مدیرانی که مجوز contacts.read_all_private دارند).
 */
export function contactScope(user: CurrentUser): Prisma.ContactWhereInput {
  const base: Prisma.ContactWhereInput = { organizationId: user.organizationId, deletedAt: null };
  if (can(user.role, "contacts.read_all_private")) return base;
  return { ...base, OR: [{ visibility: "PUBLIC" }, { ownerUserId: user.id }] };
}

/** ویرایش/حذف: مخاطب خصوصی فقط توسط مالک یا مدیر سازمان. */
export function canEditContact(
  user: CurrentUser,
  contact: { visibility: string; ownerUserId: string | null },
): boolean {
  if (can(user.role, "contacts.read_all_private")) return true;
  if (contact.visibility === "PUBLIC") return can(user.role, "contacts.write");
  return contact.ownerUserId === user.id;
}
