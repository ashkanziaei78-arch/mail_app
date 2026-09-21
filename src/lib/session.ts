import { cookies } from "next/headers";
import { sign, verifySigned } from "./crypto";

/**
 * در تولید از پیشوند __Host- استفاده می‌شود: مرورگر تضمین می‌کند کوکی فقط از
 * همین دامنه (بدون زیردامنه) و فقط روی HTTPS با Path=/ ست شده باشد؛
 * جلوی cookie fixation از سمت زیردامنه‌ها را می‌گیرد.
 */
export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-ms_session" : "ms_session";

const IDLE_SECONDS = 60 * 60 * 2;        // ۲ ساعت بی‌فعالیتی
const ABSOLUTE_SECONDS = 60 * 60 * 12;   // سقف ۱۲ ساعت از لحظه ورود

export type SessionPayload = {
  userId: string;
  organizationId: string;
  departmentId: string | null;
  role: string;
  fullName: string;
  /** لحظه ورود — سقف مطلق عمر نشست از روی همین محاسبه می‌شود */
  iat: number;
  /** انقضای بی‌فعالیتی */
  exp: number;
};

export function serialize(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function parse(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  if (!verifySigned(body, signature)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    const now = Date.now();
    if (!payload.exp || payload.exp < now) return null;
    if (!payload.iat || payload.iat + ABSOLUTE_SECONDS * 1000 < now) return null;
    return payload;
  } catch {
    return null;
  }
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "strict" as const, // درخواست‌های بین‌سایتی اصلاً کوکی نمی‌گیرند
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function setSession(payload: Omit<SessionPayload, "exp" | "iat">) {
  const now = Date.now();
  const store = await cookies();
  store.set(SESSION_COOKIE, serialize({ ...payload, iat: now, exp: now + IDLE_SECONDS * 1000 }), cookieOptions(IDLE_SECONDS));
}

/** تمدید پنجره بی‌فعالیتی بدون تغییر سقف مطلق. */
export async function refreshSession(payload: SessionPayload) {
  const store = await cookies();
  store.set(SESSION_COOKIE, serialize({ ...payload, exp: Date.now() + IDLE_SECONDS * 1000 }), cookieOptions(IDLE_SECONDS));
}

export async function clearSession() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
}

export async function getSession(): Promise<SessionPayload | null> {
  return parse((await cookies()).get(SESSION_COOKIE)?.value);
}
