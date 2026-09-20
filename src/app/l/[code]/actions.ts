"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { sign } from "@/lib/crypto";


/** بررسی کد دسترسی نامه محرمانه و صدور کوکی امضاشده که فقط برای همین لینک معتبر است. */
const accessCookieName = (code: string) => `ml_${code}`;

export async function verifyAccessCode(code: string, given: string): Promise<boolean> {
  const link = await prisma.shortLink.findUnique({ where: { code } });
  if (!link?.accessCode || link.accessCode !== given.trim()) return false;
  const store = await cookies();
  store.set(accessCookieName(code), sign(`${code}:${link.accessCode}`), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/l/${code}`,
    maxAge: 60 * 60 * 24,
  });
  return true;
}
