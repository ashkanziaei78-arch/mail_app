import { prisma } from "@/lib/db";
import { handle, requireApi } from "@/lib/api";
import { gregorianToJalali } from "@/lib/jalali";

/**
 * شماره اندیکاتور بعدی: «<سال شمسی>/<شماره چهاررقمی>».
 *
 * شماره از بزرگ‌ترین شماره همان سال به‌علاوه یک ساخته می‌شود، نه از تعداد
 * نامه‌ها؛ اینطوری حذف یک نامه باعث تکرار شماره نمی‌شود. برخورد هم‌زمان در این
 * مقیاس عملاً رخ نمی‌دهد و اگر رخ دهد کاربر شماره را دستی اصلاح می‌کند.
 */
export async function GET() {
  return handle(async () => {
    const user = await requireApi("campaigns.write");
    const year = gregorianToJalali(new Date()).year;
    const prefix = `${year}/`;

    const letters = await prisma.letter.findMany({
      where: { organizationId: user.organizationId, letterNumber: { startsWith: prefix } },
      select: { letterNumber: true },
    });

    const highest = letters.reduce((max, row) => {
      const suffix = Number((row.letterNumber ?? "").slice(prefix.length));
      return Number.isFinite(suffix) && suffix > max ? suffix : max;
    }, 0);

    return { letterNumber: `${prefix}${String(highest + 1).padStart(4, "0")}` };
  });
}
