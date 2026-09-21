"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignInPage } from "@/components/ui/sign-in";

export default function LoginClient({ heroImageSrc }: { heroImageSrc: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  /** گذرواژه درست بوده ولی حساب ۲FA دارد و منتظر کد است */
  const [totp, setTotp] = useState<{ email: string; password: string } | null>(null);

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "ورود ناموفق بود. دوباره تلاش کنید.");
        return;
      }
      if (json.data?.totpRequired) {
        setTotp({ email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") });
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.");
    } finally {
      setPending(false);
    }
  }

  async function submitTotp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!totp) return;
    setError(null);
    setPending(true);
    const code = String(new FormData(event.currentTarget).get("totpCode") ?? "");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...totp, totpCode: code }),
      });
      const json = await res.json();
      if (!json.ok) { setError(json.error); return; }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setPending(false);
    }
  }

  if (totp) {
    return (
      <main id="main" className="grid min-h-dvh place-items-center p-6">
        <form onSubmit={submitTotp} className="card w-full max-w-sm space-y-4 p-6">
          <h1 className="text-lg font-bold">تأیید دومرحله‌ای</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            کد شش‌رقمی برنامه احراز هویت را وارد کنید. اگر گوشی در دسترس نیست، یکی از کدهای پشتیبان را بزنید.
          </p>
          <label htmlFor="totpCode" className="label">کد</label>
          <input
            id="totpCode" name="totpCode" required autoFocus
            className="input tnum text-center text-lg tracking-widest" dir="ltr"
            inputMode="numeric" autoComplete="one-time-code" maxLength={11}
          />
          {error && <p role="alert" className="error-text">{error}</p>}
          <button className="btn btn-primary w-full" type="submit" disabled={pending}>
            {pending ? "در حال بررسی…" : "ورود"}
          </button>
          <button type="button" className="btn w-full" onClick={() => { setTotp(null); setError(null); }}>
            بازگشت
          </button>
        </form>
      </main>
    );
  }

  return (
    <main id="main">
      <SignInPage
        heroImageSrc={heroImageSrc}
        errorMessage={error}
        pending={pending}
        onSignIn={handleSignIn}
        title={
          <>
            <span className="block text-base font-semibold text-primary">سامانه میلینگ سازمانی</span>
            <span className="font-light tracking-tight">ورود به حساب کاربری</span>
          </>
        }
        description="مکاتبات سازمانی خود را بسازید، مخاطبین هدف را انتخاب کنید و نامه را با پیامک برای آن‌ها بفرستید."
        heroCaption={
          <>
            <p className="text-2xl font-bold leading-relaxed">یک نامه، هزار مخاطب — هرکدام با نام خودش.</p>
            <p className="mt-2 text-white/80">تولید نامه اختصاصی، لینک کوتاه امن و ارسال پیامک شخصی‌سازی‌شده.</p>
          </>
        }
        onResetPassword={() => router.push("/reset")}
        onCreateAccount={() => setError("ثبت‌نام آزاد نیست؛ حساب کاربری را مدیر سازمان برای شما می‌سازد.")}
        onGoogleSignIn={() => setError("ورود با گوگل هنوز فعال نشده است.")}
      />
    </main>
  );
}
