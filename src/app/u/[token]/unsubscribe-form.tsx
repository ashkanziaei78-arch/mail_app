"use client";

import { useState } from "react";
import { BellOff, Check } from "lucide-react";

export default function UnsubscribeForm({ token, name, organizationName, alreadyUnsubscribed }: {
  token: string;
  name: string;
  organizationName: string;
  alreadyUnsubscribed: boolean;
}) {
  const [done, setDone] = useState(alreadyUnsubscribed);
  const [resubscribed, setResubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(consent: boolean) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/unsubscribe/${token}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ consent }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { setError(json.error); return; }
    setDone(!consent);
    setResubscribed(consent);
  }

  if (done) {
    return (
      <div className="card max-w-md p-6 text-center">
        <BellOff className="mx-auto mb-3 h-8 w-8" style={{ color: "var(--muted)" }} aria-hidden="true" />
        <h1 className="mb-2 text-lg font-bold">دیگر پیامکی دریافت نمی‌کنید</h1>
        <p className="mb-4 text-sm" style={{ color: "var(--muted)" }}>
          {name} گرامی، از این پس {organizationName} برای شما پیامکی نمی‌فرستد.
          نامه‌هایی که قبلاً لینکشان را گرفته‌اید همچنان قابل مشاهده‌اند.
        </p>
        <button className="btn" onClick={() => send(true)} disabled={busy}>
          {busy ? "در حال ثبت…" : "پشیمان شدم، دوباره پیامک بفرستید"}
        </button>
        {error && <p role="alert" className="error-text mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="card max-w-md p-6 text-center">
      {resubscribed && (
        <p role="status" className="mb-3 flex items-center justify-center gap-1 text-sm font-bold" style={{ color: "var(--success)" }}>
          <Check className="h-4 w-4" />دریافت پیامک دوباره فعال شد.
        </p>
      )}
      <h1 className="mb-2 text-lg font-bold">لغو دریافت پیامک</h1>
      <p className="mb-4 text-sm" style={{ color: "var(--muted)" }}>
        {name} گرامی، اگر ادامه دهید، {organizationName} دیگر برای شما پیامک نمی‌فرستد.
      </p>
      <button className="btn btn-danger w-full" onClick={() => send(false)} disabled={busy}>
        {busy ? "در حال ثبت…" : "دیگر پیامک نفرست"}
      </button>
      {error && <p role="alert" className="error-text mt-2">{error}</p>}
    </div>
  );
}
