import { cookies } from "next/headers";
import { sign, verifySigned } from "./crypto";

export const SESSION_COOKIE = "ms_session";
const MAX_AGE = 60 * 60 * 8; // ۸ ساعت

export type SessionPayload = {
  userId: string;
  organizationId: string;
  departmentId: string | null;
  role: string;
  fullName: string;
  exp: number;
};

// ponytail: HMAC-signed JSON cookie instead of NextAuth — no adapter, no provider config.
// Swap for NextAuth/OIDC when SSO becomes a requirement.
export function serialize(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function parse(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature || !verifySigned(body, signature)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function setSession(payload: Omit<SessionPayload, "exp">) {
  const store = await cookies();
  store.set(SESSION_COOKIE, serialize({ ...payload, exp: Date.now() + MAX_AGE * 1000 }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  return parse((await cookies()).get(SESSION_COOKIE)?.value);
}
