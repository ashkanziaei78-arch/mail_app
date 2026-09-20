"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, PageHeader } from "@/components/ui/primitives";
import { SUPPORTED_PROVIDERS } from "@/lib/sms";

export default function SmsSettingsClient({ current }: {
  current: { providerName: string; senderNumber: string; hasKey: boolean } | null;
}) {
  const router = useRouter();
  const [providerName, setProviderName] = useState(current?.providerName ?? "console");
  const [senderNumber, setSenderNumber] = useState(current?.senderNumber ?? "10008663");
  const [apiKey, setApiKey] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/sms-settings", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ providerName, senderNumber, apiKey }),
    });
    const json = await res.json();
    setBusy(false);
    setMessage(json.ok ? { tone: "ok", text: "تنظیمات ذخیره شد." } : { tone: "err", text: json.error });
    if (json.ok) { setApiKey(""); router.refresh(); }
  }

  async function sendTest() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/sms-settings", {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: testPhone, text: "پیامک آزمایشی سامانه میلینگ سازمانی" }),
    });
    const json = await res.json();
    setBusy(false);
    setMessage(json.ok ? { tone: "ok", text: "پیامک آزمایشی ارسال شد." } : { tone: "err", text: json.error });
  }

  return (
    <>
      <PageHeader title="تنظیمات پیامک" description="اتصال سامانه به درگاه پیامک سازمان. کلید API رمزنگاری‌شده ذخیره می‌شود و هرگز نمایش داده نمی‌شود." />

      {message && (
        <p role="alert" className="mb-4 rounded-xl px-4 py-3 text-sm font-semibold"
           style={{ background: message.tone === "ok" ? "var(--success-bg)" : "var(--danger-bg)", color: message.tone === "ok" ? "var(--success)" : "var(--danger)" }}>
          {message.text}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={save} className="card space-y-4 p-5">
          <h2 className="font-bold">درگاه پیامک</h2>

          <Field label="درگاه" hint={providerName === "console" ? "حالت آزمایشی: پیامک واقعی ارسال نمی‌شود و فقط در لاگ سرور چاپ می‌گردد." : undefined}>
            <select className="select" value={providerName} onChange={(e) => setProviderName(e.target.value)}>
              {SUPPORTED_PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>

          <Field label="شماره فرستنده" required>
            <input className="input tnum" dir="ltr" value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)} required />
          </Field>

          <Field
            label="کلید API"
            required={providerName !== "console" && !current?.hasKey}
            hint={current?.hasKey ? "کلیدی ذخیره شده است. برای تغییر، کلید جدید را وارد کنید؛ خالی بگذارید تا همان بماند." : undefined}
          >
            <input className="input" dir="ltr" type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={current?.hasKey ? "••••••••" : ""} />
          </Field>

          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "در حال ذخیره…" : "ذخیره تنظیمات"}</button>
        </form>

        <div className="card space-y-4 p-5">
          <h2 className="font-bold">ارسال آزمایشی</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            پیش از ارسال یک کمپین واقعی، صحت تنظیمات را با یک شماره در اختیار خودتان بررسی کنید.
          </p>
          <Field label="شماره همراه" hint="نمونه: ۰۹۱۲۳۴۵۶۷۸۹">
            <input className="input tnum" dir="ltr" inputMode="tel" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
          </Field>
          <button className="btn" onClick={sendTest} disabled={busy || !testPhone}>ارسال پیامک آزمایشی</button>
        </div>
      </div>
    </>
  );
}
