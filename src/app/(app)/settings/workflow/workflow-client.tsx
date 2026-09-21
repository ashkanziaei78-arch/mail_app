"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Badge, EmptyState, Field, PageHeader } from "@/components/ui/primitives";
import Modal from "@/components/ui/modal";
import { useConfirm, useToast } from "@/components/ui/toast";
import { faNumber } from "@/lib/jalali";

type Position = {
  id: string; name: string; rank: number; canApprove: boolean; canSign: boolean;
  userCount: number; stepCount: number;
};
type Workflow = {
  id: string; name: string; isDefault: boolean; campaignCount: number;
  steps: Array<{ id: string; order: number; positionName: string; label: string | null; optional: boolean }>;
};

export default function WorkflowClient({ positions, workflows }: { positions: Position[]; workflows: Workflow[] }) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [adding, setAdding] = useState<null | "position" | "workflow">(null);

  async function remove(kind: "positions" | "workflows", id: string, name: string, body: string) {
    const ok = await confirm({ title: `حذف ${name}`, body, confirmLabel: "حذف", destructive: true });
    if (!ok) return;
    const res = await fetch(`/api/${kind}/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.ok) { toast("error", json.error); return; }
    toast("success", "حذف شد.");
    router.refresh();
  }

  return (
    <>
      <PageHeader
        title="سمت‌ها و گردش تأیید"
        description="سمت می‌گوید هر فرد در سلسله‌مراتب کجاست؛ گردش تأیید می‌گوید نامه به ترتیب از کدام سمت‌ها عبور کند."
      />

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">سمت‌های سازمانی</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding("position")}>
            <Plus className="h-4 w-4" />سمت جدید
          </button>
        </div>

        {positions.length === 0 ? (
          <EmptyState
            title="سمتی تعریف نشده"
            description="نمونه: مدیرکل (رتبه ۱۰)، معاون (۲۰)، رئیس اداره (۳۰)، کارشناس مسئول (۴۰). رتبه کمتر یعنی بالاتر."
            action={<button className="btn btn-primary" onClick={() => setAdding("position")}>افزودن اولین سمت</button>}
          />
        ) : (
          <div className="card overflow-x-auto">
            <table className="table">
              <caption className="sr-only">سمت‌های سازمانی</caption>
              <thead>
                <tr><th>نام سمت</th><th>رتبه</th><th>اختیارات</th><th>کاربران</th><th><span className="sr-only">عملیات</span></th></tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.id}>
                    <td className="font-semibold">{p.name}</td>
                    <td className="tnum">{faNumber(p.rank)}</td>
                    <td>
                      <span className="flex flex-wrap gap-1">
                        {p.canApprove && <Badge tone="info">تأیید نامه</Badge>}
                        {p.canSign && <Badge tone="success">امضای نامه</Badge>}
                        {!p.canApprove && !p.canSign && <span style={{ color: "var(--muted)" }}>—</span>}
                      </span>
                    </td>
                    <td className="tnum">{faNumber(p.userCount)}</td>
                    <td>
                      <button className="btn btn-sm btn-danger" aria-label={`حذف سمت ${p.name}`}
                              onClick={() => remove("positions", p.id, `سمت ${p.name}`,
                                p.userCount > 0
                                  ? `${faNumber(p.userCount)} کاربر این سمت را دارند؛ اول سمتشان را عوض کنید.`
                                  : "این سمت حذف می‌شود.")}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">گردش‌های تأیید</h2>
          <button className="btn btn-primary btn-sm" disabled={positions.length === 0} onClick={() => setAdding("workflow")}>
            <Plus className="h-4 w-4" />گردش جدید
          </button>
        </div>

        {positions.length === 0 ? (
          <p className="hint">اول باید حداقل یک سمت تعریف کنید.</p>
        ) : workflows.length === 0 ? (
          <EmptyState
            title="گردش تأییدی تعریف نشده"
            description="بدون گردش کار، نامه با یک تأیید ساده ارسال می‌شود. با تعریف گردش، نامه به ترتیب از سمت‌های انتخابی عبور می‌کند."
            action={<button className="btn btn-primary" onClick={() => setAdding("workflow")}>ساخت گردش تأیید</button>}
          />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {workflows.map((w) => (
              <li key={w.id} className="card p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{w.name}</p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      {faNumber(w.campaignCount)} کمپین از این گردش استفاده کرده‌اند
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1">
                    {w.isDefault && <Badge tone="info">پیش‌فرض</Badge>}
                    <button className="btn btn-sm btn-danger" aria-label={`حذف گردش ${w.name}`}
                            onClick={() => remove("workflows", w.id, `گردش ${w.name}`, "این گردش تأیید حذف می‌شود.")}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                </div>

                <ol className="flex flex-wrap items-center gap-1 text-sm">
                  {w.steps.map((step, index) => (
                    <li key={step.id} className="flex items-center gap-1">
                      <span className="rounded-lg px-2 py-1" style={{ background: "var(--surface-2)" }}>
                        <span className="tnum" style={{ color: "var(--muted)" }}>{faNumber(step.order)}.</span>{" "}
                        <span className="font-semibold">{step.positionName}</span>
                        {step.optional && <span style={{ color: "var(--muted)" }}> (اختیاری)</span>}
                      </span>
                      {index < w.steps.length - 1 && <ArrowLeft className="h-3.5 w-3.5" style={{ color: "var(--muted)" }} aria-hidden="true" />}
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        )}
      </section>

      {adding === "position" && (
        <PositionDialog onClose={() => setAdding(null)}
                        onSaved={() => { setAdding(null); toast("success", "سمت ساخته شد."); router.refresh(); }} />
      )}
      {adding === "workflow" && (
        <WorkflowDialog positions={positions} onClose={() => setAdding(null)}
                        onSaved={() => { setAdding(null); toast("success", "گردش تأیید ساخته شد."); router.refresh(); }} />
      )}
      {confirmDialog}
    </>
  );
}

function PositionDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/positions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        rank: Number(form.get("rank")),
        canApprove: form.get("canApprove") === "on",
        canSign: form.get("canSign") === "on",
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { setError(json.error); return; }
    onSaved();
  }

  return (
    <Modal title="سمت سازمانی جدید" description="سمت جدا از نقش دسترسی است؛ نقش می‌گوید چه کاری مجاز است، سمت می‌گوید در سلسله‌مراتب کجاست." size="sm" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="نام سمت" required><input className="input" name="name" required maxLength={80} placeholder="رئیس اداره روابط عمومی" /></Field>
        <Field label="رتبه" required hint="عدد کمتر یعنی جایگاه بالاتر. نمونه: مدیرکل ۱۰، معاون ۲۰، رئیس اداره ۳۰.">
          <input className="input tnum" name="rank" type="number" min={1} max={999} defaultValue={100} required />
        </Field>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" name="canApprove" className="custom-checkbox" />
          می‌تواند نامه را تأیید کند
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" name="canSign" className="custom-checkbox" />
          می‌تواند پای نامه را امضا کند
        </label>
        {error && <p role="alert" className="error-text">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>انصراف</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "در حال ذخیره…" : "ساخت سمت"}</button>
        </div>
      </form>
    </Modal>
  );
}

function WorkflowDialog({ positions, onClose, onSaved }: {
  positions: Position[]; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(true);
  const [steps, setSteps] = useState<Array<{ positionId: string; label: string; optional: boolean }>>([
    { positionId: positions[0]?.id ?? "", label: "", optional: false },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (steps.some((s) => !s.positionId)) { setError("برای هر مرحله یک سمت انتخاب کنید."); return; }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/workflows", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, isDefault, steps }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { setError(json.error); return; }
    onSaved();
  }

  return (
    <Modal title="گردش تأیید جدید" description="ترتیب مراحل همان ترتیبی است که نامه طی می‌کند." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="نام گردش" required>
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="گردش استاندارد دبیرخانه" />
        </Field>

        <fieldset>
          <legend className="label">مراحل</legend>
          <ol className="space-y-2">
            {steps.map((step, index) => (
              <li key={index} className="flex flex-wrap items-center gap-2 rounded-xl border p-2">
                <span className="tnum grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold"
                      style={{ background: "var(--surface-2)" }}>
                  {faNumber(index + 1)}
                </span>
                <select
                  className="select w-auto flex-1"
                  aria-label={`سمت مرحله ${index + 1}`}
                  value={step.positionId}
                  onChange={(e) => setSteps((list) => list.map((s, i) => (i === index ? { ...s, positionId: e.target.value } : s)))}
                >
                  {positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <label className="flex cursor-pointer items-center gap-1 text-xs">
                  <input type="checkbox" className="custom-checkbox" checked={step.optional}
                         onChange={(e) => setSteps((list) => list.map((s, i) => (i === index ? { ...s, optional: e.target.checked } : s)))} />
                  اختیاری
                </label>
                {steps.length > 1 && (
                  <button type="button" className="btn btn-sm btn-danger" aria-label={`حذف مرحله ${index + 1}`}
                          onClick={() => setSteps((list) => list.filter((_, i) => i !== index))}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ol>
          <button type="button" className="btn btn-sm mt-2" disabled={steps.length >= 10}
                  onClick={() => setSteps((list) => [...list, { positionId: positions[0]?.id ?? "", label: "", optional: false }])}>
            <Plus className="h-4 w-4" />افزودن مرحله
          </button>
        </fieldset>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="custom-checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
          گردش پیش‌فرض سازمان باشد (روی کمپین‌های جدید اعمال می‌شود)
        </label>

        {error && <p role="alert" className="error-text">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>انصراف</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "در حال ذخیره…" : "ساخت گردش"}</button>
        </div>
      </form>
    </Modal>
  );
}
