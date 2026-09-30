"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, KeyRound, PenLine, ShieldCheck, ShieldOff, Smartphone, Upload } from "lucide-react";
import { Badge, Field, PageHeader } from "@/components/ui/primitives";
import Modal from "@/components/ui/modal";
import PasswordInput from "@/components/ui/password-input";
import { useToast } from "@/components/ui/toast";
import { faDateTime, faNumber } from "@/lib/jalali";
import { AVATAR_STYLES, avatarDataUrl, avatarSrc } from "@/lib/avatars";

export default function SecurityClient({ email, totpEnabled, backupCodesLeft, mobilePhone, passwordChangedAt, signatureImagePath, avatarPath, baleChatId }: {
  email: string;
  totpEnabled: boolean;
  backupCodesLeft: number;
  mobilePhone: string | null;
  passwordChangedAt: string;
  signatureImagePath: string | null;
  baleChatId: string | null;
  avatarPath: string | null;
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

        <AvatarCard current={avatarPath} />

        <SignatureCard current={signatureImagePath} />

        <BaleCard current={baleChatId} />

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

/**
 * امضای کاربر.
 * در سربرگ، هر کادری که نوعش «امضای فرستنده» باشد همین تصویر را می‌گیرد؛ پس
 * کاربر یک بار امضایش را می‌گذارد و در همه نامه‌هایش می‌نشیند.
 */
function SignatureCard({ current }: { current: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/account/signature", { method: "POST", body: form });
    const json = await res.json();
    setBusy(false);
    event.target.value = "";
    if (!json.ok) { toast("error", json.error); return; }
    toast("success", "امضا ذخیره شد.");
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    await fetch("/api/account/signature", { method: "DELETE" });
    setBusy(false);
    toast("success", "امضا برداشته شد.");
    router.refresh();
  }

  return (
    <section className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 font-bold"><PenLine className="h-5 w-5" />امضای من</h2>
      <p className="mb-4 text-sm" style={{ color: "var(--muted)" }}>
        تصویر امضایتان را یک بار آپلود کنید تا در کادر امضای سربرگ نامه‌هایتان چاپ شود.
        بهترین نتیجه: امضای روی کاغذ سفید، اسکن یا عکس، با پس‌زمینه شفاف (PNG).
      </p>

      <div className="mb-4 flex h-24 items-center justify-center rounded-xl border border-dashed bg-white p-2">
        {current
          ? <img src={current} alt="امضای شما" className="max-h-full object-contain" />
          : <span className="text-sm" style={{ color: "var(--muted)" }}>هنوز امضایی ثبت نشده</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="btn btn-primary">
          <Upload className="h-4 w-4" />
          {current ? "جایگزینی امضا" : "آپلود امضا"}
          <input type="file" className="sr-only" accept="image/png,image/jpeg,image/webp" onChange={upload} disabled={busy} />
        </label>
        {current && <button className="btn btn-danger" onClick={remove} disabled={busy}>برداشتن امضا</button>}
      </div>
    </section>
  );
}

/** عکس پروفایل: یا یکی از طرح‌های آماده، یا عکس خودِ کاربر. */
function AvatarCard({ current }: { current: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const src = avatarSrc(current);

  async function call(init: RequestInit, message: string) {
    setBusy(true);
    const res = await fetch("/api/account/avatar", init);
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { toast("error", json.error); return; }
    toast("success", message);
    router.refresh();
  }

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    event.target.value = "";
    await call({ method: "POST", body: form }, "عکس پروفایل ذخیره شد.");
  }

  return (
    <section className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 font-bold"><ImageIcon className="h-5 w-5" />عکس پروفایل</h2>
      <p className="mb-4 text-sm" style={{ color: "var(--muted)" }}>
        یا عکس خودتان را آپلود کنید، یا یکی از طرح‌های آماده را بردارید.
      </p>

      <div className="mb-4 flex items-center gap-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl"
              style={{ background: "var(--surface-2)" }}>
          {src
            ? <img src={src} alt="عکس پروفایل شما" className="h-full w-full object-cover" />
            : <span className="text-xs" style={{ color: "var(--muted)" }}>ندارد</span>}
        </span>
        <div className="flex flex-wrap gap-2">
          <label className="btn btn-sm">
            <Upload className="h-4 w-4" />
            آپلود عکس
            <input type="file" className="sr-only" accept="image/png,image/jpeg,image/webp"
                   onChange={upload} disabled={busy} />
          </label>
          {current && (
            <button className="btn btn-sm btn-danger" disabled={busy}
                    onClick={() => call({ method: "DELETE" }, "عکس پروفایل برداشته شد.")}>
              برداشتن
            </button>
          )}
        </div>
      </div>

      <fieldset>
        <legend className="label">گالری طرح‌ها</legend>
        <ul className="flex flex-wrap gap-2">
          {AVATAR_STYLES.map((style) => {
            const selected = current === `avatar:${style.id}`;
            return (
              <li key={style.id}>
                <button
                  className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl transition-transform hover:scale-105"
                  style={{ outline: selected ? "3px solid var(--primary)" : "1px solid var(--border)", outlineOffset: 1 }}
                  aria-label={`انتخاب طرح ${style.label}`}
                  aria-pressed={selected}
                  disabled={busy}
                  onClick={() => call({
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ styleId: style.id }),
                  }, `طرح «${style.label}» انتخاب شد.`)}
                >
                  <img src={avatarDataUrl(style.id) ?? ""} alt="" className="h-full w-full object-cover" />
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>
    </section>
  );
}

/**
 * شناسه گفت‌وگوی بله.
 *
 * ربات بله فقط به کسی می‌تواند پیام بدهد که خودش اول به ربات پیام داده باشد؛
 * برای همین این عدد را کاربر از ربات می‌گیرد و اینجا ثبت می‌کند.
 */
function BaleCard({ current }: { current: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState(current ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const res = await fetch("/api/account/bale", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ baleChatId: value.trim() }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { toast("error", json.error); return; }
    toast("success", value.trim() ? "شناسه بله ذخیره شد." : "شناسه بله حذف شد.");
    router.refresh();
  }

  return (
    <section className="card p-5">
      <h2 className="mb-1 font-bold">اعلان در بله</h2>
      <p className="mb-4 text-sm leading-7" style={{ color: "var(--muted)" }}>
        اگر می‌خواهید نامه‌های کارتابل را در بله هم خبردار شوید: در بله به ربات سازمان پیام بدهید،
        شناسه گفت‌وگویی که به شما می‌دهد را اینجا بگذارید. خالی گذاشتن یعنی اعلان بله نمی‌خواهید.
      </p>
      <Field label="شناسه گفت‌وگوی بله" hint="یک عدد است، مثل ۱۲۳۴۵۶۷۸۹">
        <input className="input tnum" dir="ltr" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} />
      </Field>
      <button className="btn mt-3" onClick={save} disabled={busy}>ذخیره</button>
    </section>
  );
}
