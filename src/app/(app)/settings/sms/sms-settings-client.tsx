"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, PageHeader } from "@/components/ui/primitives";
import PasswordInput from "@/components/ui/password-input";
import { useToast } from "@/components/ui/toast";
import { SUPPORTED_PROVIDERS } from "@/lib/sms";

export default function SmsSettingsClient({ current, baleConnected }: {
  current: { providerName: string; senderNumber: string; hasKey: boolean } | null;
  baleConnected: boolean;
}) {
  const router = useRouter();
  const [providerName, setProviderName] = useState(current?.providerName ?? "console");
  const [senderNumber, setSenderNumber] = useState(current?.senderNumber ?? "10008663");
  const [apiKey, setApiKey] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [baleToken, setBaleToken] = useState("");
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
      body: JSON.stringify({ phone: testPhone, text: "پیامک آزمایشی سامانه میلینگ سازمانی" }),
    });
    const json = await res.json();
    setBusy(false);
    toast(json.ok ? "success" : "error", json.ok ? "پیامک آزمایشی ارسال شد." : json.error);
  }

  async function saveBale(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const res = await fetch("/api/settings/bale", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: baleToken }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { toast("error", json.error); return; }
    toast("success", "ربات بله متصل شد.");
    setBaleToken("");
    router.refresh();
  }

  async function testBale() {
    setBusy(true);
    const res = await fetch("/api/settings/bale", { method: "PUT" });
    const json = await res.json();
    setBusy(false);
    toast(json.ok ? "success" : "error", json.ok ? "پیام آزمایشی بله ارسال شد." : json.error);
  }

  async function disconnectBale() {
    setBusy(true);
    const res = await fetch("/api/settings/bale", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ disconnect: true }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { toast("error", json.error); return; }
    toast("success", "اتصال بله قطع شد.");
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

        <form onSubmit={saveBale} className="card space-y-4 p-5 lg:col-span-2">
          <h2 className="font-bold">ربات بله {baleConnected && <span className="text-xs font-normal" style={{ color: "var(--success)" }}>— متصل است</span>}</h2>
          <p className="text-sm leading-7" style={{ color: "var(--muted)" }}>
            وقتی نامه‌ای وارد کارتابل تأیید کسی می‌شود، علاوه بر پیامک در بله هم به او خبر داده می‌شود.
            ساخت ربات: در بله به <span dir="ltr">@BotFather</span> پیام بدهید، ربات بسازید و توکنی که می‌دهد را اینجا بگذارید.
            بعد هر کاربر باید یک بار در بله به همان ربات پیام بدهد و «شناسه گفت‌وگو» را در «حساب و امضای من» ثبت کند.
          </p>
          <Field
            label="توکن ربات بله"
            hint={baleConnected ? "توکنی ذخیره شده است. برای تغییر، توکن تازه را وارد کنید." : undefined}
          >
            <PasswordInput autoComplete="off" value={baleToken} onChange={(e) => setBaleToken(e.target.value)} placeholder={baleConnected ? "••••••••" : ""} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" type="submit" disabled={busy || !baleToken}>ذخیره توکن بله</button>
            {baleConnected && <button className="btn" type="button" onClick={testBale} disabled={busy}>پیام آزمایشی بله</button>}
            {baleConnected && <button className="btn btn-danger" type="button" onClick={disconnectBale} disabled={busy}>قطع اتصال</button>}
          </div>
        </form>
      </div>
    </>
  );
}
