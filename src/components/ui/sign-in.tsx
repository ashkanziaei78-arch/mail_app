"use client";

import React, { useRef, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

// --- آیکون‌ها ---
const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
  </svg>
);

// --- تایپ‌ها ---
export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

interface SignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  /** متنی که روی تصویر سمت چپ نمایش داده می‌شود (وقتی testimonial نداریم) */
  heroCaption?: React.ReactNode;
  /** درصد تیرگی روی تصویر: هرچه کمتر، عکس واضح‌تر دیده می‌شود */
  heroOverlay?: number;
  /** جابه‌جایی دستی بنرها؛ اگر داده شود، دکمه‌های پیمایش و کشیدن با ماوس فعال می‌شود */
  onPrevSlide?: () => void;
  onNextSlide?: () => void;
  testimonials?: Testimonial[];
  /** خطای سرور؛ زیر فرم و با role="alert" نمایش داده می‌شود */
  errorMessage?: string | null;
  pending?: boolean;
  onSignIn?: (event: React.FormEvent<HTMLFormElement>) => void;
  onGoogleSignIn?: () => void;
  onResetPassword?: () => void;
  onCreateAccount?: () => void;
}

// --- زیرکامپوننت‌ها ---
const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-primary/70 focus-within:bg-primary/5">
    {children}
  </div>
);

const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial; delay: string }) => (
  <figure className={`animate-testimonial ${delay} flex w-64 items-start gap-3 rounded-3xl border border-white/15 bg-black/35 p-5 backdrop-blur-xl`}>
    <img src={testimonial.avatarSrc} className="h-10 w-10 rounded-2xl object-cover" alt="" />
    <figcaption className="text-sm leading-snug text-white">
      <p className="font-semibold">{testimonial.name}</p>
      <p className="text-white/70">{testimonial.handle}</p>
      <p className="mt-1 text-white/90">{testimonial.text}</p>
    </figcaption>
  </figure>
);

// --- کامپوننت اصلی ---
export const SignInPage: React.FC<SignInPageProps> = ({
  title = <span className="font-light tracking-tight text-foreground">خوش آمدید</span>,
  description = "برای ورود به سامانه، ایمیل سازمانی و گذرواژه خود را وارد کنید.",
  heroImageSrc,
  heroCaption,
  heroOverlay = 45,
  onPrevSlide,
  onNextSlide,
  testimonials = [],
  errorMessage = null,
  pending = false,
  onSignIn,
  onGoogleSignIn,
  onResetPassword,
  onCreateAccount,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  /** نقطه شروع کشیدن با ماوس/انگشت روی بنر */
  const dragStart = useRef<number | null>(null);

  return (
    <div className="flex min-h-dvh w-full flex-col-reverse md:flex-row">
      {/* ستون فرم ورود */}
      <section className="flex flex-1 items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <h1 className="animate-element animate-delay-100 text-3xl font-bold leading-tight md:text-4xl">{title}</h1>
            <p className="animate-element animate-delay-200 text-muted-foreground">{description}</p>

            {/* method="post" لازم است: اگر فرم پیش از hydration ارسال شود، پیش‌فرض GET
                گذرواژه را در نوار آدرس و تاریخچه مرورگر می‌گذاشت. */}
            <form className="space-y-5" method="post" onSubmit={onSignIn} noValidate>
              <div className="animate-element animate-delay-300">
                <label htmlFor="email" className="label">ایمیل سازمانی</label>
                <GlassInputWrapper>
                  <input
                    id="email" name="email" type="email" required
                    autoComplete="email" inputMode="email" dir="ltr"
                    placeholder="name@organization.ir"
                    aria-invalid={errorMessage ? true : undefined}
                    className="w-full rounded-2xl bg-transparent p-4 text-sm focus:outline-none"
                  />
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-400">
                <label htmlFor="password" className="label">گذرواژه</label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input
                      id="password" name="password" required
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password" dir="ltr"
                      placeholder="••••••••"
                      aria-invalid={errorMessage ? true : undefined}
                      className="w-full rounded-2xl bg-transparent p-4 pl-12 text-sm focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "پنهان کردن گذرواژه" : "نمایش گذرواژه"}
                      aria-pressed={showPassword}
                      className="absolute inset-y-0 left-2 flex w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-500 flex items-center justify-between text-sm">
                <label className="flex cursor-pointer items-center gap-3">
                  <input type="checkbox" name="rememberMe" className="custom-checkbox" />
                  <span>مرا به خاطر بسپار</span>
                </label>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); onResetPassword?.(); }}
                  className="font-semibold text-primary transition-colors hover:underline"
                >
                  بازیابی گذرواژه
                </a>
              </div>

              {errorMessage && (
                <p role="alert" className="animate-element rounded-xl border px-3 py-2 text-sm font-semibold"
                   style={{ background: "var(--danger-bg)", color: "var(--danger)", borderColor: "var(--danger)" }}>
                  {errorMessage}
                </p>
              )}

              <button type="submit" disabled={pending} className="btn btn-primary animate-element animate-delay-600 w-full rounded-2xl py-4">
                {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {pending ? "در حال ورود…" : "ورود به سامانه"}
              </button>
            </form>

            <div className="animate-element animate-delay-700 relative flex items-center justify-center">
              <span className="w-full border-t border-border" />
              <span className="absolute bg-background px-4 text-sm text-muted-foreground">یا ورود با</span>
            </div>

            <button
              type="button"
              onClick={onGoogleSignIn}
              className="btn animate-element animate-delay-800 w-full rounded-2xl py-4"
            >
              <GoogleIcon />
              ورود با حساب گوگل
              <span className="badge" style={{ background: "var(--warn-bg)", color: "var(--warn)" }}>به‌زودی</span>
            </button>

            <p className="animate-element animate-delay-900 text-center text-sm text-muted-foreground">
              حساب کاربری ندارید؟{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); onCreateAccount?.(); }} className="font-semibold text-primary hover:underline">
                درخواست دسترسی
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ستون تصویر — روی موبایل به یک نوار کوتاه تبدیل می‌شود */}
      {heroImageSrc && (
        <section className="relative h-56 shrink-0 p-3 sm:h-64 md:h-auto md:flex-1 md:p-4">
          {/* پشت تصویر یک پس‌زمینه طراحی‌شده هست: اگر عکس بیرونی بالا نیاید
              (فیلتر شبکه، اینترنت کند) صفحه باز هم عمدی و کامل دیده می‌شود. */}
          <div
            className="animate-slide-right animate-delay-300 absolute inset-3 touch-pan-y rounded-3xl bg-cover bg-center md:inset-4"
            style={{
              // تیرگی از تنظیمات می‌آید: کم که باشد خود عکس دیده می‌شود، زیاد که
              // باشد متن روی عکس خواناتر است.
              backgroundImage:
                `linear-gradient(140deg, rgba(10,34,51,${(heroOverlay / 100).toFixed(2)}), rgba(15,92,122,${(heroOverlay / 160).toFixed(2)})), url(${heroImageSrc}), ` +
                "radial-gradient(120% 90% at 20% 0%, #0f5c7a 0%, #0a2233 55%, #06151f 100%)",
              cursor: onNextSlide ? "grab" : undefined,
            }}
            role="img"
            aria-label="تصویر سازمانی سامانه"
            onPointerDown={(event) => { dragStart.current = event.clientX; }}
            onPointerUp={(event) => {
              const start = dragStart.current;
              dragStart.current = null;
              if (start === null || !onNextSlide || !onPrevSlide) return;
              const delta = event.clientX - start;
              // آستانه ۴۰ پیکسل تا کلیک ساده، بنر را عوض نکند
              if (delta < -40) onNextSlide();
              else if (delta > 40) onPrevSlide();
            }}
          />
          <div
            className="animate-slide-right animate-delay-300 pointer-events-none absolute inset-3 rounded-3xl md:inset-4"
            style={{ background: `linear-gradient(to top, rgba(0,0,0,${(heroOverlay / 100 * 0.8).toFixed(2)}), transparent 60%)` }}
          />

          {onPrevSlide && onNextSlide && (
            <>
              <button
                type="button"
                onClick={onPrevSlide}
                aria-label="بنر قبلی"
                className="absolute top-1/2 right-6 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-white backdrop-blur md:right-8"
                style={{ background: "rgba(0,0,0,.35)" }}
              >
                ›
              </button>
              <button
                type="button"
                onClick={onNextSlide}
                aria-label="بنر بعدی"
                className="absolute top-1/2 left-6 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-white backdrop-blur md:left-8"
                style={{ background: "rgba(0,0,0,.35)" }}
              >
                ‹
              </button>
            </>
          )}

          {heroCaption && testimonials.length === 0 && (
            <div className="animate-element animate-delay-1000 absolute bottom-6 right-6 left-6 text-white md:bottom-12 md:right-12 md:left-12">
              {heroCaption}
            </div>
          )}

          {/* شرط لایسنس Unsplash: نام عکاس و منبع ذکر شود. */}
          {heroImageSrc.includes("unsplash.com") && (
            <p className="absolute bottom-1 left-6 text-[10px] text-white/50 md:left-8">
              عکس: Kenrick Baksh / Unsplash
            </p>
          )}

          {testimonials.length > 0 && (
            <div className="absolute bottom-8 flex w-full justify-center gap-4 px-8">
              <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-1000" />
              {testimonials[1] && <div className="hidden xl:flex"><TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1200" /></div>}
              {testimonials[2] && <div className="hidden 2xl:flex"><TestimonialCard testimonial={testimonials[2]} delay="animate-delay-1400" /></div>}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default SignInPage;
