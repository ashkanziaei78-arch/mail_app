"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, PageHeader } from "@/components/ui/primitives";
import PasswordInput from "@/components/ui/password-input";
import { useToast } from "@/components/ui/toast";
import { SUPPORTED_PROVIDERS } from "@/lib/sms";
import { MESSENGERS } from "@/lib/messengers";

export default function SmsSettingsClient({ current, connected }: {
  current: { providerName: string; senderNumber: string; hasKey: boolean } | null;
  /** کدام پیام‌رسان‌ها توکن ثبت‌شده دارند */
  connected: Record<string, boolean>;
}) {
  const router = useRouter();
  const [providerName, setProviderName] = useState(current?.providerName ?? "console");
  const [senderNumber, setSenderNumber] = useState(current?.senderNumber ?? "10008663");
  const [apiKey, setApiKey] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const res = await fetch("/api/sms-settings", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ providerName, senderNumber, apiKey }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { toast("error", json.error); return; }
    toast("success", "تنظیمات ذخیره شد.");
    setApiKey("");
    router.refresh();
  }

  async function sendTest() {
    setBusy(true);
    const res = await fetch("/api/sms-settings", {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: testPhone, text: "پیامک آزمایشی میلینگ پرس" }),
    });
    const json = await res.json();
    setBusy(false);
    toast(json.ok ? "success" : "error", json.ok ? "پیامک آزمایشی ارسال شد." : json.error);
  }

  async function saveMessenger(messenger: string, event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const res = await fetch("/api/settings/bale", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ messenger, token: tokens[messenger] ?? "" }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { toast("error", json.error); return; }
    toast("success", "ربات متصل شد.");
    setTokens((t) => ({ ...t, [messenger]: "" }));
    router.refresh();
  }

  async function testMessenger(messenger: string) {
    setBusy(true);
    const res = await fetch("/api/settings/bale", {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ messenger }),
    });
    const json = await res.json();
    setBusy(false);
    toast(json.ok ? "success" : "error", json.ok ? "پیام آزمایشی ارسال شد." : json.error);
  }

  async function disconnectMessenger(messenger: string) {
    setBusy(true);
    const res = await fetch("/api/settings/bale", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ messenger, disconnect: true }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { toast("error", json.error); return; }
    toast("success", "اتصال قطع شد.");
    router.refresh();
  }

  return (
    <>
      <PageHeader title="تنظیمات پیامک" description="اتصال سامانه به درگاه پیامک سازمان. کلید API رمزنگاری‌شده ذخیره می‌شود و هرگز نمایش داده نمی‌شود." />

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
            <PasswordInput autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={current?.hasKey ? "••••••••" : ""} />
          </Field>

          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "در حال ذخیره…" : "ذخیره تنظیمات"}</button>
        </form>

        <div className="card space-y-4 p-5">
          <h2 className="font-bold">ارسال آزمایشی</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            پیش از ارسال یک نامه واقعی، صحت تنظیمات را با یک شماره در اختیار خودتان بررسی کنید.
          </p>
          <Field label="شماره همراه" hint="نمونه: ۰۹۱۲۳۴۵۶۷۸۹">
            <input className="input tnum" dir="ltr" inputMode="tel" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
          </Field>
          <button className="btn" onClick={sendTest} disabled={busy || !testPhone}>ارسال پیامک آزمایشی</button>
        </div>

        <section className="card space-y-4 p-5 lg:col-span-2">
          <h2 className="font-bold">پیام‌رسان‌ها</h2>
          <p className="text-sm leading-7" style={{ color: "var(--muted)" }}>
            وقتی نامه‌ای وارد کارتابل تأیید کسی می‌شود، علاوه بر پیامک، در پیام‌رسان هم به او خبر داده می‌شود.
            برای هر پیام‌رسان یک ربات بسازید و توکنش را اینجا بگذارید. بعد هر کاربر یک بار به همان ربات پیام می‌دهد و
            «شناسه گفت‌وگو» را در «حساب و امضای من» ثبت می‌کند.
          </p>

          <div className="grid gap-3 lg:grid-cols-3">
            {MESSENGERS.map((m) => (
              <form key={m.id} onSubmit={(e) => saveMessenger(m.id, e)} className="space-y-3 rounded-xl border p-4">
                <h3 className="font-bold">
                  {m.label}
                  {connected[m.id] && <span className="ms-2 text-xs font-normal" style={{ color: "var(--success)" }}>متصل است</span>}
                </h3>
                <p className="text-xs leading-6" style={{ color: "var(--muted)" }}>{m.hint}</p>
                <Field label="توکن ربات" hint={connected[m.id] ? "توکنی ذخیره شده؛ برای تغییر، توکن تازه را وارد کنید." : undefined}>
                  <PasswordInput
                    autoComplete="off"
                    value={tokens[m.id] ?? ""}
                    onChange={(e) => setTokens((t) => ({ ...t, [m.id]: e.target.value }))}
                    placeholder={connected[m.id] ? "••••••••" : ""}
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !tokens[m.id]}>ذخیره</button>
                  {connected[m.id] && <button className="btn btn-sm" type="button" onClick={() => testMessenger(m.id)} disabled={busy}>پیام آزمایشی</button>}
                  {connected[m.id] && <button className="btn btn-danger btn-sm" type="button" onClick={() => disconnectMessenger(m.id)} disabled={busy}>قطع</button>}
                </div>
              </form>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
