"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Modal from "@/components/ui/modal";
import { Field } from "@/components/ui/primitives";
import LetterheadCanvas, { type BoxGeometry } from "@/components/ui/letterhead-canvas";
import type { FieldDefinition } from "@/components/ui/dynamic-field";
import { ALIGN_LABELS, FIELD_AREAS, FIELD_TYPES, LETTERHEAD_FONTS } from "@/lib/validators";

type Letterhead = {
  id: string; name: string; fileUrl: string; fields: FieldDefinition[];
  marginTopMm: number; marginBottomMm: number; marginSideMm: number;
};

const WEIGHTS = [
  { value: "300", label: "نازک" },
  { value: "400", label: "معمولی" },
  { value: "500", label: "نیمه‌پررنگ" },
  { value: "600", label: "پررنگ" },
  { value: "700", label: "خیلی پررنگ" },
  { value: "800", label: "سیاه" },
];

/**
 * طراح سربرگ.
 *
 * مدیر تصویر سربرگ را می‌بیند و کادرهای متن را با ماوس روی همان تصویر می‌کشد و
 * اندازه می‌دهد — مثل کادر متن در پاورپوینت. هر کادر یک فیلد است؛ کاربرِ نامه
 * بعداً فقط همین کادرها را پر می‌کند، نه یک فرم کلی.
 */
export default function LetterheadDesigner({
  letterhead, onClose, onChanged, notify,
}: {
  letterhead: Letterhead;
  onClose: () => void;
  onChanged: () => void;
  notify: (tone: "success" | "error", text: string) => void;
}) {
  const [fields, setFields] = useState<FieldDefinition[]>(letterhead.fields);
  const [selectedId, setSelectedId] = useState<string | null>(letterhead.fields[0]?.id ?? null);
  /** حالت آزمایش: کادرها با داده نمونه پر می‌شوند تا نتیجه واقعی دیده شود. */
  const [testing, setTesting] = useState(false);
  /** حاشیه متن روی برگه — تعیین می‌کند متن از کجای سربرگ شروع شود */
  const [margins, setMargins] = useState({
    top: letterhead.marginTopMm,
    bottom: letterhead.marginBottomMm,
    side: letterhead.marginSideMm,
  });

  async function saveMargins(next: typeof margins) {
    setMargins(next);
    const res = await fetch(`/api/letterheads/${letterhead.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ marginTopMm: next.top, marginBottomMm: next.bottom, marginSideMm: next.side }),
    });
    const json = await res.json();
    if (!json.ok) notify("error", json.error);
    else onChanged();
  }
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setFields(letterhead.fields); }, [letterhead.fields]);

  const selected = fields.find((f) => f.id === selectedId) ?? null;

  /**
   * ذخیره با تأخیر.
   * کشیدن کادر ده‌ها رویداد در ثانیه تولید می‌کند؛ اگر هر کدام یک درخواست شبکه
   * بزند، سرور را می‌کوبد و خود کشیدن هم کند می‌شود. پس تغییرها در state جمع
   * می‌شوند و ۶۰۰ میلی‌ثانیه بعد از آخرین حرکت، یک‌جا ذخیره می‌گردند.
   */
  function scheduleSave(id: string) {
    setDirty((d) => new Set(d).add(id));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void flush(), 600);
  }

  async function flush() {
    const ids = [...dirtyRef.current];
    if (ids.length === 0) return;
    dirtyRef.current = new Set();
    setDirty(new Set());
    for (const id of ids) {
      const field = fieldsRef.current.find((f) => f.id === id);
      if (!field) continue;
      const res = await fetch(`/api/letterheads/${letterhead.id}/fields/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label: field.label, type: field.type, area: field.area,
          placeholder: field.placeholder, helpText: field.helpText,
          required: field.required, defaultValue: field.defaultValue, options: field.options,
          x: field.x, y: field.y, width: field.width, height: field.height,
          fontFamily: field.fontFamily, fontSize: field.fontSize, fontWeight: field.fontWeight,
          color: field.color, align: field.align, lineHeight: field.lineHeight,
        }),
      });
      const json = await res.json();
      if (!json.ok) { notify("error", json.error); return; }
    }
    onChanged();
  }

  // نسخه‌های ref از state، چون flush داخل setTimeout اجرا می‌شود و باید آخرین مقدار را ببیند.
  const fieldsRef = useRef(fields);
  const dirtyRef = useRef(dirty);
  useEffect(() => { fieldsRef.current = fields; }, [fields]);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  function patchLocal(id: string, patch: Partial<FieldDefinition>) {
    setFields((list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    scheduleSave(id);
  }

  function onGeometryChange(id: string, geometry: BoxGeometry) {
    patchLocal(id, geometry);
  }

  async function remove(field: FieldDefinition) {
    setBusy(true);
    const res = await fetch(`/api/letterheads/${letterhead.id}/fields/${field.id}`, { method: "DELETE" });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { notify("error", json.error); return; }
    setFields((list) => list.filter((f) => f.id !== field.id));
    if (selectedId === field.id) setSelectedId(null);
    notify("success", `کادر «${field.label}» حذف شد.`);
    onChanged();
  }

  /** داده نمونه هر کادر بر اساس نوعش؛ فقط برای پیش‌نمایش است و ذخیره نمی‌شود. */
  const sampleValues: Record<string, string> = Object.fromEntries(
    fields.map((field) => {
      if (field.type === "DATE") return [field.key, new Date().toISOString().slice(0, 10)];
      if (field.type === "NUMBER") return [field.key, "۱۴۰۴/۱۲۳"];
      if (field.type === "SELECT") return [field.key, field.options[0] ?? field.label];
      if (field.type === "SIGNATURE") return [field.key, ""];
      if (field.type === "RICH_TEXT" || field.type === "TEXTAREA") {
        return [field.key, "با سلام و احترام، بدین‌وسیله به استحضار می‌رساند نمونه متن نامه برای آزمایش چیدمان کادرهای سربرگ در این قسمت نمایش داده می‌شود."];
      }
      return [field.key, `نمونه ${field.label}`];
    }),
  );

  return (
    <Modal
      title={`طراحی سربرگ «${letterhead.name}»`}
      description="کادرها را با ماوس روی تصویر جابه‌جا و بزرگ/کوچک کنید. هر کادر یک فیلد است و کاربر هنگام نوشتن نامه فقط همین کادرها را پر می‌کند."
      size="xl"
      onClose={async () => { await flush(); onClose(); }}
      footer={
        <>
          {dirty.size > 0 && <span className="me-auto text-xs" style={{ color: "var(--muted)" }}>در حال ذخیره…</span>}
          <button className="btn btn-primary" onClick={async () => { await flush(); onClose(); }}>پایان</button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button className="btn btn-sm" onClick={() => setTesting((v) => !v)}>
              {testing ? "پایان آزمایش" : "آزمایش سربرگ"}
            </button>
            {testing && (
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                کادرها با داده نمونه پر شده‌اند تا ببینید نامه واقعی چطور درمی‌آید. چیزی ذخیره نمی‌شود.
              </span>
            )}
          </div>

          <LetterheadCanvas
            imageUrl={letterhead.fileUrl}
            fields={fields}
            values={testing ? sampleValues : undefined}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onGeometryChange={onGeometryChange}
          />
          <p className="hint">
            کشیدن با ماوس یا انگشت؛ با صفحه‌کلید: کلیدهای جهت برای جابه‌جایی، Alt + جهت برای تغییر اندازه، Shift برای گام بزرگ‌تر.
          </p>

          <div className="mt-3 rounded-xl border p-3">
            <p className="mb-1 text-sm font-bold">حاشیه متن نامه روی این سربرگ</p>
            <p className="mb-3 text-xs" style={{ color: "var(--muted)" }}>
              متن نامه روی همین تصویر چاپ می‌شود. اگر طرح سربرگ بالای برگه جا می‌گیرد، حاشیه بالا را زیاد کنید تا متن روی طرح نیفتد.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {([
                ["top", "حاشیه بالا"],
                ["bottom", "حاشیه پایین"],
                ["side", "حاشیه چپ و راست"],
              ] as const).map(([key, label]) => (
                <label key={key} className="block text-xs">
                  <span className="mb-1 block font-semibold">{label}: {margins[key]} میلی‌متر</span>
                  <input
                    type="range" min={0} max={key === "side" ? 60 : 120} step={1}
                    value={margins[key]} className="w-full"
                    onChange={(e) => setMargins((m) => ({ ...m, [key]: Number(e.target.value) }))}
                    onMouseUp={() => saveMargins(margins)}
                    onTouchEnd={() => saveMargins(margins)}
                    onKeyUp={() => saveMargins(margins)}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">کادرها ({fields.length.toLocaleString("fa-IR")})</h3>
            <button className="btn btn-sm btn-primary" onClick={() => setAdding(true)} disabled={busy}>
              <Plus className="h-4 w-4" />کادر جدید
            </button>
          </div>

          {fields.length === 0 ? (
            <p className="rounded-xl p-3 text-sm" style={{ background: "var(--info-bg)", color: "var(--info)" }}>
              هنوز کادری نساخته‌اید. برای نمونه سه کادر بسازید: «تاریخ»، «موضوع» و «شرح مسئله».
              کاربر بعداً دقیقاً با همین سه کادر روبه‌رو می‌شود، نه بیشتر.
            </p>
          ) : (
            <ul className="space-y-1">
              {fields.map((field) => (
                <li key={field.id}>
                  <button
                    className="choice-card w-full text-right"
                    data-selected={field.id === selectedId}
                    onClick={() => setSelectedId(field.id)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {field.label}{field.required && <span style={{ color: "var(--danger)" }}> *</span>}
                      </span>
                      <span className="block truncate text-xs" style={{ color: "var(--muted)" }}>
                        {FIELD_TYPES.find((t) => t.value === field.type)?.label}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selected && (
            <section className="card space-y-3 p-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold">تنظیم کادر انتخاب‌شده</h4>
                <button className="btn btn-sm btn-danger" disabled={busy}
                        aria-label={`حذف کادر ${selected.label}`} onClick={() => remove(selected)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <Field label="برچسب">
                <input className="input" value={selected.label}
                       onChange={(e) => patchLocal(selected.id, { label: e.target.value })} />
              </Field>

              <Field label="نوع" hint={FIELD_TYPES.find((t) => t.value === selected.type)?.hint || undefined}>
                <select className="select" value={selected.type}
                        onChange={(e) => patchLocal(selected.id, { type: e.target.value as FieldDefinition["type"] })}>
                  {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>

              <Field label="جای فیلد در نامه" hint={FIELD_AREAS.find((a) => a.value === selected.area)?.hint}>
                <select className="select" value={selected.area}
                        onChange={(e) => patchLocal(selected.id, { area: e.target.value as FieldDefinition["area"] })}>
                  {FIELD_AREAS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="فونت">
                  <select className="select" value={selected.fontFamily}
                          onChange={(e) => patchLocal(selected.id, { fontFamily: e.target.value })}>
                    {LETTERHEAD_FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </Field>
                <Field label="اندازه (px)">
                  <input className="input tnum" type="number" min={6} max={96} value={selected.fontSize}
                         onChange={(e) => patchLocal(selected.id, { fontSize: Number(e.target.value) || 14 })} />
                </Field>
                <Field label="ضخامت">
                  <select className="select" value={selected.fontWeight}
                          onChange={(e) => patchLocal(selected.id, { fontWeight: e.target.value })}>
                    {WEIGHTS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
                  </select>
                </Field>
                <Field label="چینش">
                  <select className="select" value={selected.align}
                          onChange={(e) => patchLocal(selected.id, { align: e.target.value })}>
                    {Object.entries(ALIGN_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                <Field label="رنگ متن">
                  <input className="input h-11 p-1" type="color" value={selected.color}
                         onChange={(e) => patchLocal(selected.id, { color: e.target.value })} />
                </Field>
                <Field label="فاصله خطوط">
                  <input className="input tnum" type="number" step="0.1" min={1} max={3} value={selected.lineHeight}
                         onChange={(e) => patchLocal(selected.id, { lineHeight: Number(e.target.value) || 1.8 })} />
                </Field>
              </div>

              <details>
                <summary className="cursor-pointer text-xs font-semibold" style={{ color: "var(--muted)" }}>
                  مختصات دقیق (درصد)
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["x", "y", "width", "height"] as const).map((key) => (
                    <Field key={key} label={{ x: "از راست", y: "از بالا", width: "پهنا", height: "بلندا" }[key]}>
                      <input className="input tnum" type="number" step="0.5" min={0} max={100} value={Math.round(selected[key] * 10) / 10}
                             onChange={(e) => patchLocal(selected.id, { [key]: Number(e.target.value) || 0 })} />
                    </Field>
                  ))}
                </div>
              </details>

              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" className="custom-checkbox" checked={selected.required}
                       onChange={(e) => patchLocal(selected.id, { required: e.target.checked })} />
                پر کردنش الزامی باشد
              </label>

              <p className="hint">
                برای بردن مقدار این کادر داخل متن نامه:{" "}
                <code className="select-all rounded px-1" style={{ background: "var(--surface-2)" }} dir="ltr">
                  {`{{فیلد:${selected.key}}}`}
                </code>
              </p>
            </section>
          )}
        </aside>
      </div>

      {adding && (
        <AddBoxDialog
          letterheadId={letterhead.id}
          existingKeys={fields.map((f) => f.key)}
          onClose={() => setAdding(false)}
          onCreated={(field) => {
            setAdding(false);
            setFields((list) => [...list, field]);
            setSelectedId(field.id);
            notify("success", "کادر ساخته شد؛ حالا روی تصویر جابه‌جایش کنید.");
            onChanged();
          }}
        />
      )}
    </Modal>
  );
}

function AddBoxDialog({ letterheadId, existingKeys, onClose, onCreated }: {
  letterheadId: string;
  existingKeys: string[];
  onClose: () => void;
  onCreated: (field: FieldDefinition) => void;
}) {
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [type, setType] = useState("TEXT");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (existingKeys.includes(key)) { setError("کلیدی با این نام روی این سربرگ هست."); return; }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/letterheads/${letterheadId}/fields`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, label, type, area: "HEADER", options: [] }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { setError(json.error); return; }
    onCreated({ ...json.data, options: json.data.optionsJson ?? [] });
  }

  return (
    <Modal title="کادر جدید" description="بعد از ساخت، کادر را روی تصویر سربرگ سر جای درستش بکشید." size="sm" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="برچسب" required hint="همین متن را کاربر هنگام نوشتن نامه می‌بیند.">
          <input className="input" required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="موضوع" />
        </Field>
        <Field label="کلید لاتین" required hint="برای درج مقدار در متن نامه: {{فیلد:کلید}}">
          <input className="input" dir="ltr" required pattern="[a-zA-Z][a-zA-Z0-9_]*" value={key}
                 onChange={(e) => setKey(e.target.value)} placeholder="subject" />
        </Field>
        <Field label="نوع" hint={FIELD_TYPES.find((t) => t.value === type)?.hint || undefined}>
          <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
            {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        {error && <p role="alert" className="error-text">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>انصراف</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "در حال ساخت…" : "ساخت کادر"}</button>
        </div>
      </form>
    </Modal>
  );
}
