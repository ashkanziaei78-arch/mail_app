import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { currentUser, type CurrentUser } from "./auth";
import { can, type PermissionCode } from "./rbac";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** احراز هویت + بررسی مجوز برای route handlerها */
export async function requireApi(permission?: PermissionCode): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) throw new ApiError(401, "برای این عملیات باید وارد شوید.");
  if (permission && !can(user.role, permission)) throw new ApiError(403, "دسترسی لازم را ندارید.");
  return user;
}

export async function readBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError(400, "بدنه درخواست JSON معتبر نیست.");
  }
  return schema.parse(raw);
}

/** پوشش خطاهای یکنواخت — هر route handler داخل این اجرا می‌شود */
export async function handle<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    return NextResponse.json({ ok: true, data: await fn() });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      const message = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("، ");
      return NextResponse.json({ ok: false, error: `داده ورودی نامعتبر — ${message}` }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "خطای ناشناخته";
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ ok: false, error: "رکورد تکراری است." }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ ok: false, error: "خطای داخلی سرور." }, { status: 500 });
  }
}
