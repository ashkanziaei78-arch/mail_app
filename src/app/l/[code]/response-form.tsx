"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, MessageSquare, X } from "lucide-react";
import { Field } from "@/components/ui/primitives";

export type ResponseKind = "ACKNOWLEDGED" | "ACCEPTED" | "DECLINED" | "REPLIED";

const OPTIONS: Array<{ kind: ResponseKind; label: string; Icon: typeof Check; tone: string }> = [
  { kind: "ACCEPTED", label: "می‌پذیرم / حضور دارم", Icon: Check, tone: "var(--success)" },
  { kind: "DECLINED", label: "نمی‌توانم حاضر شوم", Icon: X, tone: "var(--danger)" },
  { kind: "REPLIED", label: "پاسخ می‌نویسم", Icon: MessageSquare, tone: "var(--info)" },
];

/** فرم پاسخ گیرنده — پایین صفحه نامه، بدون نیاز به حساب کاربری. */
export default function ResponseForm({ code, existing }: {
  code: string;
  existing: { kind: ResponseKind; message: string | null; at: string } | null;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<ResponseKind | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (existing) {
    const label = OPTIONS.find((o) => o.kind === existing.kind)?.label ?? "دریافت شد";
    return (
      <section className="no-print mx-auto mt-4 max-w-[210mm] rounded-xl border p-4" style={{ background: "var(--surface)" }}>
        <p className="font-bold" style={{ color: "var(--success)" }}>پاسخ شما ثبت شد</p>
        <p className="mt-1 text-sm">{label}</p>
        {existing.message && <p className="mt-2 whitespace-pre-wrap text-sm" style={{ color: "var(--muted)" }}>{existing.message}</p>}
        <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>ثبت در {existing.at}</p>
      </section>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!kind) { setError("یکی از گزینه‌ها را انتخاب کنید."); return; }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/letters/${code}/respond`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, message: message.trim() || null }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { setError(json.error); return; }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="no-print mx-auto mt-4 max-w-[210mm] space-y-3 rounded-xl border p-4"
          style={{ background: "var(--surface)" }}>
      <h2 className="font-bold">پاسخ شما به این نامه</h2>
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        پاسخ شما برای سازمان فرستنده ثبت می‌شود. این کار اختیاری است.
      </p>

      <fieldset>
        <legend className="sr-only">نوع پاسخ</legend>
        <div className="flex flex-wrap gap-2">
          {OPTIONS.map(({ kind: value, label, Icon, tone }) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              aria-pressed={kind === value}
              className="btn"
              style={kind === value ? { borderColor: tone, color: tone, fontWeight: 700 } : undefined}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {kind === "REPLIED" && (
        <Field label="متن پاسخ" required>
          <textarea className="textarea" value={message} onChange={(e) => setMessage(e.target.value)} required maxLength={2000} />
        </Field>
      )}

      {error && <p role="alert" className="error-text">{error}</p>}

      <button className="btn btn-primary" type="submit" disabled={busy || !kind}>
        {busy ? "در حال ثبت…" : "ثبت پاسخ"}
      </button>
    </form>
  );
}
