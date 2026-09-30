"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SignInPage } from "@/components/ui/sign-in";

export type Slide = { src: string; caption: string };

export default function LoginClient({ slides, overlay = 45, seconds = 10 }: { slides: Slide[]; overlay?: number; seconds?: number }) {
  const router = useRouter();
  /**
   * اسلاید بنرها: هر ۱۰ ثانیه تصویر و متن بعدی. اگر فقط یک بنر باشد، تایمری
   * روشن نمی‌شود. برای کسی که در تنظیمات سیستمش «کاهش حرکت» را زده، تصویر ثابت
   * می‌ماند.
   */
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), seconds * 1000);
    return () => clearInterval(timer);
  }, [slides.length, seconds]);

  const slide = slides[Math.min(index, slides.length - 1)];
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
      // پاسخ نرسید. ممکن است ورود روی سرور انجام شده باشد ولی پاسخش در راه گم
      // شده باشد (مرورگرهای داخل اپ‌ها زود قطع می‌کنند)، پس به‌جای بن‌بست،
      // یک بار داشبورد را امتحان می‌کنیم؛ اگر واقعاً وارد نشده باشد، خود سامانه
      // دوباره به همین صفحه برمی‌گرداند.
      setError("پاسخ سرور دیر رسید. اگر وارد نشدید، یک بار دیگر بزنید.");
      router.replace("/dashboard");
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
      setError("پاسخ سرور دیر رسید. یک بار دیگر بزنید.");
      router.replace("/dashboard");
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
        heroImageSrc={slide.src}
        heroOverlay={overlay}
        onPrevSlide={slides.length > 1 ? () => setIndex((i) => (i - 1 + slides.length) % slides.length) : undefined}
        onNextSlide={slides.length > 1 ? () => setIndex((i) => (i + 1) % slides.length) : undefined}
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
            <p className="text-2xl font-bold leading-relaxed">{slide.caption}</p>
            {slides.length > 1 && (
              <div className="mt-4 flex gap-2" role="tablist" aria-label="بنرها">
                {slides.map((s, i) => (
                  <button
                    key={`${s.src}-${i}`}
                    role="tab"
                    aria-selected={i === index}
                    aria-label={`بنر ${i + 1}`}
                    onClick={() => setIndex(i)}
                    className="h-2 rounded-full transition-all"
                    style={{ width: i === index ? "1.5rem" : ".5rem", background: i === index ? "#fff" : "rgba(255,255,255,.45)" }}
                  />
                ))}
              </div>
            )}
          </>
        }
        onResetPassword={() => router.push("/reset")}
        onCreateAccount={() => setError("ثبت‌نام آزاد نیست؛ حساب کاربری را مدیر سازمان برای شما می‌سازد.")}
        onGoogleSignIn={() => setError("ورود با گوگل هنوز فعال نشده است.")}
      />
    </main>
  );
}
