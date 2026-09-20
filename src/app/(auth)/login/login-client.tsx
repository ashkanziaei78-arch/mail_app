"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignInPage } from "@/components/ui/sign-in";

export default function LoginClient({ heroImageSrc }: { heroImageSrc: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.");
    } finally {
      setPending(false);
    }
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
        onResetPassword={() => setError("بازیابی گذرواژه توسط مدیر سازمان انجام می‌شود. با دبیرخانه تماس بگیرید.")}
        onCreateAccount={() => setError("ثبت‌نام آزاد نیست؛ حساب کاربری را مدیر سازمان برای شما می‌سازد.")}
        onGoogleSignIn={() => setError("ورود با گوگل هنوز فعال نشده است.")}
      />
    </main>
  );
}
