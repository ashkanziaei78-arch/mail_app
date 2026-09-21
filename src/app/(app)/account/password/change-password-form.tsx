"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, PageHeader } from "@/components/ui/primitives";
import { PASSWORD_RULES } from "@/lib/password";
import PasswordInput from "@/components/ui/password-input";

export default function ChangePasswordForm({ firstLogin = false }: { firstLogin?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword") ?? "");
    if (newPassword !== String(form.get("confirmPassword") ?? "")) {
      setBusy(false);
      setError("گذرواژه جدید و تکرار آن یکسان نیستند.");
      return;
    }

    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword: form.get("currentPassword"), newPassword }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { setError(json.error); return; }

    setDone(true);
    setTimeout(() => { router.replace("/login"); router.refresh(); }, 1800);
  }

  if (done) {
    return (
      <div className="card mx-auto max-w-md p-6 text-center">
        <h1 className="mb-2 font-bold">گذرواژه تغییر کرد</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          برای امنیت بیشتر، همه نشست‌های فعال بسته شد. در حال انتقال به صفحه ورود…
        </p>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="تغییر گذرواژه" description="پس از تغییر، همه دستگاه‌هایی که با حساب شما وارد شده‌اند خارج می‌شوند." />
      {firstLogin && (
        <p role="status" className="mx-auto mb-4 max-w-md rounded-xl px-4 py-3 text-sm font-semibold"
           style={{ background: "var(--info-bg)", color: "var(--info)" }}>
          این نخستین ورود شماست. گذرواژه‌ای که مدیر سازمان ساخته را با گذرواژه‌ای که فقط خودتان می‌دانید جایگزین کنید.
        </p>
      )}
      <form onSubmit={submit} className="card mx-auto max-w-md space-y-4 p-5">
        <Field label="گذرواژه فعلی" required>
          <PasswordInput name="currentPassword" autoComplete="current-password" required />
        </Field>
        <Field label="گذرواژه جدید" required hint={PASSWORD_RULES}>
          <PasswordInput name="newPassword" autoComplete="new-password" required minLength={10} />
        </Field>
        <Field label="تکرار گذرواژه جدید" required>
          <PasswordInput name="confirmPassword" autoComplete="new-password" required minLength={10} />
        </Field>
        {error && <p role="alert" className="error-text">{error}</p>}
        <button className="btn btn-primary w-full" type="submit" disabled={busy}>
          {busy ? "در حال تغییر…" : "تغییر گذرواژه"}
        </button>
      </form>
    </>
  );
}
