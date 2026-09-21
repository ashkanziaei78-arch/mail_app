"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/primitives";
import PasswordInput from "@/components/ui/password-input";
import { PASSWORD_RULES } from "@/lib/password";

/** بازیابی گذرواژه در دو گام: درخواست کد پیامکی، سپس ثبت گذرواژه جدید. */
export default function ResetClient() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/reset", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { setError(json.error); return; }
    setNotice(json.data.hint);
    setStep(2);
  }

  async function confirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword") ?? "");
    if (newPassword !== String(form.get("confirmPassword") ?? "")) {
      setError("گذرواژه جدید و تکرار آن یکسان نیستند.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/reset", {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, code: form.get("code"), newPassword }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { setError(json.error); return; }
    setStep(3);
    setTimeout(() => router.replace("/login"), 1800);
  }

  if (step === 3) {
    return (
      <div className="card w-full max-w-sm p-6 text-center">
        <h1 className="mb-2 text-lg font-bold">گذرواژه عوض شد</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>در حال انتقال به صفحه ورود…</p>
      </div>
    );
  }

  return (
    <div className="card w-full max-w-sm p-6">
      <h1 className="mb-2 text-lg font-bold">بازیابی گذرواژه</h1>

      {step === 1 ? (
        <form onSubmit={requestCode} className="space-y-4">
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            کد بازیابی به شماره همراهی که در پروفایل شما ثبت شده پیامک می‌شود.
          </p>
          <Field label="ایمیل سازمانی" required>
            <input className="input" dir="ltr" type="email" required autoComplete="email"
                   value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {error && <p role="alert" className="error-text">{error}</p>}
          <button className="btn btn-primary w-full" type="submit" disabled={busy}>
            {busy ? "در حال ارسال…" : "ارسال کد بازیابی"}
          </button>
          <Link href="/login" className="block text-center text-sm link">بازگشت به ورود</Link>
        </form>
      ) : (
        <form onSubmit={confirm} className="space-y-4">
          {notice && (
            <p role="status" className="rounded-xl px-3 py-2 text-sm" style={{ background: "var(--info-bg)", color: "var(--info)" }}>
              {notice}
            </p>
          )}
          <Field label="کد شش‌رقمی پیامک‌شده" required>
            <input className="input tnum text-center text-lg tracking-widest" dir="ltr" inputMode="numeric"
                   name="code" maxLength={6} required autoComplete="one-time-code" />
          </Field>
          <Field label="گذرواژه جدید" required hint={PASSWORD_RULES}>
            <PasswordInput name="newPassword" required minLength={10} autoComplete="new-password" />
          </Field>
          <Field label="تکرار گذرواژه جدید" required>
            <PasswordInput name="confirmPassword" required minLength={10} autoComplete="new-password" />
          </Field>
          {error && <p role="alert" className="error-text">{error}</p>}
          <button className="btn btn-primary w-full" type="submit" disabled={busy}>
            {busy ? "در حال ثبت…" : "ثبت گذرواژه جدید"}
          </button>
          <button type="button" className="btn w-full" onClick={() => { setStep(1); setError(null); }}>
            کد نیامد؟ دوباره درخواست بده
          </button>
        </form>
      )}
    </div>
  );
}
