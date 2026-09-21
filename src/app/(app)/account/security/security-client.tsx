"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import { Badge, Field, PageHeader } from "@/components/ui/primitives";
import Modal from "@/components/ui/modal";
import PasswordInput from "@/components/ui/password-input";
import { useToast } from "@/components/ui/toast";
import { faDateTime, faNumber } from "@/lib/jalali";

export default function SecurityClient({ email, totpEnabled, backupCodesLeft, mobilePhone, passwordChangedAt }: {
  email: string;
  totpEnabled: boolean;
  backupCodesLeft: number;
  mobilePhone: string | null;
  passwordChangedAt: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [disabling, setDisabling] = useState(false);
  const [busy, setBusy] = useState(false);

  async function startSetup() {
    setBusy(true);
    const res = await fetch("/api/account/totp", { method: "POST" });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { toast("error", json.error); return; }
    setSetup(json.data);
  }

  return (
    <>
      <PageHeader title="امنیت حساب" description="گذرواژه، احراز هویت دومرحله‌ای و شماره بازیابی." />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-1 flex items-center gap-2 font-bold">
            {totpEnabled ? <ShieldCheck className="h-5 w-5" style={{ color: "var(--success)" }} /> : <ShieldOff className="h-5 w-5" style={{ color: "var(--muted)" }} />}
            احراز هویت دومرحله‌ای
            {totpEnabled ? <Badge tone="success">فعال</Badge> : <Badge tone="warn">غیرفعال</Badge>}
          </h2>
          <p className="mb-4 text-sm" style={{ color: "var(--muted)" }}>
            با فعال بودن آن، دانستن گذرواژه به‌تنهایی برای ورود کافی نیست؛ کد شش‌رقمی برنامه
            احراز هویت (Google Authenticator، Authy، …) هم لازم است.
          </p>

          {totpEnabled ? (
            <>
              <p className="mb-3 text-sm">
                کدهای پشتیبان باقی‌مانده: <span className="tnum font-bold">{faNumber(backupCodesLeft)}</span>
                {backupCodesLeft <= 2 && (
                  <span style={{ color: "var(--warn)" }}> — رو به اتمام است؛ بهتر است ۲FA را یک بار غیرفعال و دوباره فعال کنید.</span>
                )}
              </p>
              <button className="btn btn-danger" onClick={() => setDisabling(true)}>غیرفعال کردن</button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={startSetup} disabled={busy}>
              {busy ? "در حال آماده‌سازی…" : "فعال کردن احراز هویت دومرحله‌ای"}
            </button>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-1 flex items-center gap-2 font-bold"><KeyRound className="h-5 w-5" />گذرواژه</h2>
          <p className="mb-4 text-sm" style={{ color: "var(--muted)" }}>
            آخرین تغییر: <span className="tnum">{faDateTime(passwordChangedAt)}</span>
          </p>
          <Link href="/account/password" className="btn">تغییر گذرواژه</Link>

          <hr className="my-5" />

          <h2 className="mb-1 flex items-center gap-2 font-bold"><Smartphone className="h-5 w-5" />شماره بازیابی</h2>
          {mobilePhone ? (
            <p className="text-sm">
              کد بازیابی گذرواژه به <span className="tnum" dir="ltr">{mobilePhone}</span> پیامک می‌شود.
            </p>
          ) : (
            <p className="text-sm" style={{ color: "var(--warn)" }}>
              شماره‌ای ثبت نشده — بدون آن نمی‌توانید خودتان گذرواژه را بازیابی کنید.
              از مدیر سازمان بخواهید شماره همراهتان را در پروفایلتان ثبت کند.
            </p>
          )}
        </section>
      </div>

      {setup && (
        <TotpSetupDialog
          setup={setup}
          email={email}
          onClose={() => setSetup(null)}
          onDone={() => { setSetup(null); toast("success", "احراز هویت دومرحله‌ای فعال شد."); router.refresh(); }}
        />
      )}
      {disabling && (
        <DisableTotpDialog
          onClose={() => setDisabling(false)}
          onDone={() => { setDisabling(false); toast("success", "احراز هویت دومرحله‌ای غیرفعال شد."); router.refresh(); }}
        />
      )}
    </>
  );
}

function TotpSetupDialog({ setup, email, onClose, onDone }: {
  setup: { secret: string; otpauthUrl: string };
  email: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/account/totp", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { setError(json.error); return; }
    setBackupCodes(json.data.backupCodes);
  }

  if (backupCodes) {
    return (
      <Modal
        title="کدهای پشتیبان"
        description="این کدها فقط همین یک بار نمایش داده می‌شوند. جایی امن نگهشان دارید — اگر گوشی را از دست بدهید، تنها راه ورود همین‌هاست."
        size="sm"
        onClose={onDone}
        footer={<button className="btn btn-primary" onClick={onDone}>ذخیره کردم، ببند</button>}
      >
        <ul className="tnum grid grid-cols-2 gap-2 rounded-xl p-3 text-center font-mono" style={{ background: "var(--surface-2)" }} dir="ltr">
          {backupCodes.map((backup) => <li key={backup} className="select-all">{backup}</li>)}
        </ul>
        <button
          className="btn btn-sm mt-3"
          onClick={() => navigator.clipboard?.writeText(backupCodes.join("\n"))}
        >
          کپی همه کدها
        </button>
      </Modal>
    );
  }

  return (
    <Modal
      title="فعال‌سازی احراز هویت دومرحله‌ای"
      description="در برنامه احراز هویت، حساب جدید بسازید و کلید زیر را وارد کنید."
      size="sm"
      onClose={onClose}
    >
      <form onSubmit={confirm} className="space-y-4">
        <div>
          <p className="label">کلید (دستی وارد کنید)</p>
          <p className="tnum select-all break-all rounded-xl p-3 text-center font-mono text-sm"
             style={{ background: "var(--surface-2)" }} dir="ltr">
            {setup.secret}
          </p>
          <p className="hint">نام حساب: <span dir="ltr">{email}</span> — نوع: TOTP، ۶ رقمی، هر ۳۰ ثانیه</p>
        </div>

        <details>
          <summary className="cursor-pointer text-sm font-semibold">نشانی otpauth (برای ساخت QR)</summary>
          <p className="mt-2 select-all break-all rounded-xl p-2 text-xs" style={{ background: "var(--surface-2)" }} dir="ltr">
            {setup.otpauthUrl}
          </p>
        </details>

        <Field label="کد شش‌رقمی برنامه" required hint="پس از افزودن کلید، کدی که نشان می‌دهد را وارد کنید.">
          <input
            className="input tnum text-center text-lg tracking-widest" dir="ltr" inputMode="numeric"
            autoComplete="one-time-code" maxLength={6} required
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
        </Field>

        {error && <p role="alert" className="error-text">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>انصراف</button>
          <button type="submit" className="btn btn-primary" disabled={busy || code.length < 6}>
            {busy ? "در حال بررسی…" : "تأیید و فعال‌سازی"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DisableTotpDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    const res = await fetch("/api/account/totp", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { setError(json.error); return; }
    onDone();
  }

  return (
    <Modal
      title="غیرفعال کردن احراز هویت دومرحله‌ای"
      description="پس از این، ورود فقط با گذرواژه ممکن می‌شود — یعنی امنیت حسابتان کمتر."
      size="sm"
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="گذرواژه فعلی" required hint="برای اطمینان از اینکه خودتان هستید.">
          <PasswordInput name="password" autoComplete="current-password" required />
        </Field>
        {error && <p role="alert" className="error-text">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>انصراف</button>
          <button type="submit" className="btn btn-danger" disabled={busy}>{busy ? "در حال ثبت…" : "غیرفعال کن"}</button>
        </div>
      </form>
    </Modal>
  );
}
