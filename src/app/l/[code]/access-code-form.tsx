"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/primitives";

export default function AccessCodeForm({ code, verify }: {
  code: string;
  verify: (code: string, given: string) => Promise<boolean>;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const ok = await verify(code, value);
    setBusy(false);
    if (!ok) { setError("کد دسترسی نادرست است. کد شش‌رقمی ارسال‌شده در پیامک دوم را وارد کنید."); return; }
    router.refresh();
  }

  return (
    <main id="main" className="grid min-h-dvh place-items-center p-6">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <h1 className="text-lg font-bold">نامه محرمانه</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          این نامه محرمانه است. کد دسترسی شش‌رقمی که با پیامک جداگانه برای شما ارسال شده را وارد کنید.
        </p>
        <Field label="کد دسترسی" required error={error ?? undefined}>
          <input
            className="input tnum text-center text-lg tracking-widest" dir="ltr" inputMode="numeric"
            autoComplete="one-time-code" maxLength={6} required value={value}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
            aria-invalid={error ? true : undefined}
          />
        </Field>
        <button className="btn btn-primary w-full" type="submit" disabled={busy || value.length < 6}>
          {busy ? "در حال بررسی…" : "مشاهده نامه"}
        </button>
      </form>
    </main>
  );
}
