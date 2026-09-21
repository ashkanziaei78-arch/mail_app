"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ListPlus, Plus, Star, Trash2 } from "lucide-react";
import { Badge, EmptyState, Field, PageHeader } from "@/components/ui/primitives";
import Modal from "@/components/ui/modal";
import { useConfirm, useToast } from "@/components/ui/toast";
import { LETTER_VARIABLES } from "@/lib/render";
import DynamicField, { AREA_LABELS, type FieldDefinition } from "@/components/ui/dynamic-field";
import { FIELD_AREAS, FIELD_TYPES } from "@/lib/validators";

type Letterhead = {
  id: string; name: string; fileUrl: string; isDefault: boolean; status: string; version: number;
  fields: FieldDefinition[];
};
type Template = { id: string; name: string; bodyHtml: string };

export default function LetterheadsClient({ letterheads, templates, canWrite }: {
  letterheads: Letterhead[];
  templates: Template[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [dialog, setDialog] = useState<null | "letterhead" | "template">(null);
  const [fieldsFor, setFieldsFor] = useState<Letterhead | null>(null);

  async function call(url: string, init: RequestInit, okText?: string) {
    const res = await fetch(url, init);
    const json = await res.json();
    if (!json.ok) { toast("error", json.error); return false; }
    if (okText) toast("success", okText);
    router.refresh();
    return true;
  }

  return (
    <>
      <PageHeader
        title="سربرگ و قالب نامه"
        description="سربرگ سازمان را یک بار آپلود کنید و قالب متن نامه را با متغیرها بنویسید تا برای هر مخاطب شخصی‌سازی شود."
      />

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">سربرگ‌ها</h2>
          {canWrite && <button className="btn btn-primary btn-sm" onClick={() => setDialog("letterhead")}><Plus className="h-4 w-4" />افزودن سربرگ جدید</button>}
        </div>

        {letterheads.length === 0 ? (
          <EmptyState title="سربرگی ثبت نشده" description="تصویر سربرگ رسمی سازمان را آپلود کنید تا بالای همه نامه‌ها قرار بگیرد." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {letterheads.map((l) => (
              <li key={l.id} className="card overflow-hidden">
                <img src={l.fileUrl} alt={`پیش‌نمایش سربرگ ${l.name}`} className="h-36 w-full bg-white object-contain" loading="lazy" />
                <div className="flex items-center justify-between gap-2 border-t p-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{l.name}</p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      نسخه {l.version} — {l.fields.length ? `${l.fields.length.toLocaleString("fa-IR")} فیلد` : "بدون فیلد"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge tone={l.status === "ACTIVE" ? "success" : "neutral"}>{l.status === "ACTIVE" ? "فعال" : "غیرفعال"}</Badge>
                    {canWrite && (
                      <button className="btn btn-sm" onClick={() => setFieldsFor(l)} aria-label={`فیلدهای سربرگ ${l.name}`}>
                        <ListPlus className="h-4 w-4" />
                        فیلدها
                      </button>
                    )}
                    {l.isDefault ? (
                      <Badge tone="info">پیش‌فرض</Badge>
                    ) : canWrite ? (
                      <button className="btn btn-sm" aria-label={`تعیین «${l.name}» به‌عنوان پیش‌فرض`}
                              onClick={() => call(`/api/letterheads/${l.id}`, {
                                method: "PATCH", headers: { "content-type": "application/json" },
                                body: JSON.stringify({ isDefault: true }),
                              }, "سربرگ پیش‌فرض تغییر کرد.")}>
                        <Star className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">قالب‌های نامه</h2>
          {canWrite && <button className="btn btn-primary btn-sm" onClick={() => setDialog("template")}><Plus className="h-4 w-4" />قالب جدید</button>}
        </div>

        {templates.length === 0 ? (
          <EmptyState title="قالبی وجود ندارد" description="قالب، متن آماده نامه است؛ هنگام ساخت کمپین آن را انتخاب و در صورت نیاز ویرایش می‌کنید." />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {templates.map((t) => (
              <li key={t.id} className="card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-semibold">{t.name}</p>
                  {canWrite && (
                    <button className="btn btn-sm btn-danger" aria-label={`حذف قالب ${t.name}`}
                            onClick={async () => {
                              const ok = await confirm({
                                title: `حذف قالب ${t.name}`,
                                body: "قالب بایگانی می‌شود. کمپین‌هایی که قبلاً از آن ساخته شده‌اند تغییری نمی‌کنند.",
                                confirmLabel: "حذف قالب",
                                destructive: true,
                              });
                              if (ok) call(`/api/templates/${t.id}`, { method: "DELETE" }, "قالب حذف شد.");
                            }}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="max-h-32 overflow-hidden text-sm" style={{ color: "var(--muted)" }}
                     dangerouslySetInnerHTML={{ __html: t.bodyHtml }} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {dialog === "letterhead" && <LetterheadDialog onClose={() => setDialog(null)} onSaved={() => { setDialog(null); toast("success", "سربرگ ذخیره شد."); router.refresh(); }} />}
      {dialog === "template" && <TemplateDialog onClose={() => setDialog(null)} onSaved={() => { setDialog(null); toast("success", "قالب ذخیره شد."); router.refresh(); }} />}
      {fieldsFor && (
        <FieldsDialog
          letterhead={fieldsFor}
          onClose={() => setFieldsFor(null)}
          onChanged={() => { router.refresh(); }}
          notify={toast}
        />
      )}
      {confirmDialog}
    </>
  );
}

function LetterheadDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/letterheads", { method: "POST", body: new FormData(e.currentTarget) });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { setError(json.error); return; }
    onSaved();
  }

  return (
    <Modal title="افزودن سربرگ جدید" description="تصویر سربرگ بالای همه نامه‌های این سازمان چاپ می‌شود." size="sm" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="نام سربرگ" required><input className="input" name="name" required placeholder="سربرگ رسمی — دفتر مرکزی" /></Field>
        <Field label="تصویر سربرگ (بالای نامه)" required hint="PNG، JPG یا WEBP — حداکثر ۴ مگابایت. عرض پیشنهادی ۱۶۰۰ پیکسل.">
          <input className="input" type="file" name="file" accept="image/png,image/jpeg,image/webp" required />
        </Field>
        <Field label="تصویر پاورقی (اختیاری)"><input className="input" type="file" name="footerFile" accept="image/png,image/jpeg,image/webp" /></Field>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" name="isDefault" value="true" className="custom-checkbox" />
          سربرگ پیش‌فرض سازمان باشد
        </label>
          <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>انصراف</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "در حال آپلود…" : "ذخیره سربرگ"}</button>
        </div>
      </form>
    </Modal>
  );
}

function TemplateDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [bodyHtml, setBodyHtml] = useState("<p>{{عنوان}} {{نام_کامل}} گرامی</p>\n<p>با سلام و احترام،</p>\n<p>بدین‌وسیله از جناب‌عالی دعوت می‌شود تا در ... حضور به هم رسانید.</p>\n<p>با تشکر</p>");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/templates", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, bodyHtml }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { setError(json.error); return; }
    onSaved();
  }

  return (
    <Modal title="قالب نامه جدید" description="متغیرها هنگام ساخت نامه با اطلاعات هر مخاطب جایگزین می‌شوند." size="lg" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="نام قالب" required><input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="قالب دعوت‌نامه رسمی" /></Field>

        <Field label="متن قالب" required hint="می‌توانید از تگ‌های ساده HTML مانند <p>، <strong> و <ul> استفاده کنید.">
          <textarea className="textarea h-56 font-mono text-xs" required value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} />
        </Field>

        <fieldset>
          <legend className="label">متغیرهای قابل استفاده — برای درج، روی هرکدام کلیک کنید</legend>
          <div className="flex flex-wrap gap-2">
            {LETTER_VARIABLES.map((v) => (
              <button key={v.token} type="button" className="btn btn-sm" title={v.description}
                      onClick={() => setBodyHtml((b) => `${b}${v.token}`)}>
                {v.token}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <p className="label">پیش‌نمایش</p>
          <div className="card letter-body max-h-52 overflow-y-auto bg-white p-4 text-black" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </div>

          <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>انصراف</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "در حال ذخیره…" : "ذخیره قالب"}</button>
        </div>
      </form>
    </Modal>
  );
}


/**
 * تعریف فیلدهای یک سربرگ.
 * مدیر اینجا می‌گوید روی این سربرگ کجا یادداشت نوشته می‌شود، کجا متن قالب‌دار
 * و کجا تاریخ شمسی. کاربر هنگام ساخت نامه فقط همین‌ها را پر می‌کند.
 */
function FieldsDialog({ letterhead, onClose, onChanged, notify }: {
  letterhead: Letterhead;
  onClose: () => void;
  onChanged: () => void;
  notify: (tone: "success" | "error", text: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [preview, setPreview] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function remove(field: FieldDefinition) {
    setBusy(true);
    const res = await fetch(`/api/letterheads/${letterhead.id}/fields/${field.id}`, { method: "DELETE" });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { notify("error", json.error); return; }
    notify("success", `فیلد «${field.label}» حذف شد.`);
    onChanged();
  }

  const byArea = FIELD_AREAS.map((area) => ({
    area,
    fields: letterhead.fields.filter((f) => f.area === area.value),
  }));

  return (
    <Modal
      title={`فیلدهای سربرگ «${letterhead.name}»`}
      description="هر فیلدی که اینجا بسازید، هنگام ساخت نامه با این سربرگ به کاربر نشان داده می‌شود."
      size="lg"
      onClose={onClose}
      footer={<button className="btn" onClick={onClose}>بستن</button>}
    >
      <div className="space-y-5">
        {letterhead.fields.length === 0 ? (
          <p className="rounded-xl p-3 text-sm" style={{ background: "var(--info-bg)", color: "var(--info)" }}>
            هنوز فیلدی تعریف نشده. برای نمونه: «شماره نامه» از نوع متن در بالای نامه،
            «تاریخ نامه» از نوع تاریخ شمسی، و «یادداشت دبیرخانه» از نوع یادداشت چندخطی در پای نامه.
          </p>
        ) : (
          byArea.map(({ area, fields }) =>
            fields.length === 0 ? null : (
              <section key={area.value}>
                <h3 className="mb-2 text-sm font-bold">{area.label}</h3>
                <ul className="space-y-2">
                  {fields.map((field) => (
                    <li key={field.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3">
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {field.label}
                          {field.required && <span style={{ color: "var(--danger)" }}> *</span>}
                        </p>
                        <p className="text-xs" style={{ color: "var(--muted)" }}>
                          {FIELD_TYPES.find((t) => t.value === field.type)?.label}
                          {" — درج در متن با "}
                          <code className="select-all rounded px-1" style={{ background: "var(--surface-2)" }} dir="ltr">
                            {`{{فیلد:${field.key}}}`}
                          </code>
                        </p>
                      </div>
                      <button className="btn btn-sm btn-danger" disabled={busy}
                              aria-label={`حذف فیلد ${field.label}`} onClick={() => remove(field)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ),
          )
        )}

        {letterhead.fields.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-bold">پیش‌نمایش فرمی که کاربر می‌بیند</h3>
            <div className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
              {letterhead.fields.map((field) => (
                <div key={field.id} className={field.type === "RICH_TEXT" || field.type === "TEXTAREA" ? "sm:col-span-2" : ""}>
                  <DynamicField
                    field={field}
                    value={preview[field.key] ?? field.defaultValue ?? ""}
                    onChange={(v) => setPreview((p) => ({ ...p, [field.key]: v }))}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {adding ? (
          <AddFieldForm
            letterheadId={letterhead.id}
            existingKeys={letterhead.fields.map((f) => f.key)}
            onCancel={() => setAdding(false)}
            onSaved={() => { setAdding(false); notify("success", "فیلد اضافه شد."); onChanged(); }}
          />
        ) : (
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />افزودن فیلد
          </button>
        )}
      </div>
    </Modal>
  );
}

function AddFieldForm({ letterheadId, existingKeys, onCancel, onSaved }: {
  letterheadId: string;
  existingKeys: string[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    key: "", label: "", type: "TEXT", area: "HEADER",
    placeholder: "", helpText: "", required: false, defaultValue: "",
  });
  const [options, setOptions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (existingKeys.includes(form.key)) { setError("کلیدی با این نام روی این سربرگ هست."); return; }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/letterheads/${letterheadId}/fields`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        options: options.split("\n").map((o) => o.trim()).filter(Boolean),
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { setError(json.error); return; }
    onSaved();
  }

  const typeMeta = FIELD_TYPES.find((t) => t.value === form.type);

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
      <h3 className="font-bold sm:col-span-2">فیلد جدید</h3>

      <Field label="برچسب فارسی" required hint="همین متن به کاربر نشان داده می‌شود.">
        <input className="input" required value={form.label}
               onChange={(e) => {
                 set("label", e.target.value);
                 // پیشنهاد خودکار کلید لاتین از روی اولین تایپ، ولی قابل تغییر
                 if (!form.key) set("key", "");
               }} />
      </Field>

      <Field label="کلید لاتین" required hint="برای درج در متن نامه: {{فیلد:کلید}}">
        <input className="input" dir="ltr" required pattern="[a-zA-Z][a-zA-Z0-9_]*" value={form.key}
               onChange={(e) => set("key", e.target.value)} placeholder="letterNumber" />
      </Field>

      <Field label="نوع فیلد" required hint={typeMeta?.hint || undefined}>
        <select className="select" value={form.type} onChange={(e) => set("type", e.target.value)}>
          {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>

      <Field label="جای فیلد روی برگه" required
             hint={FIELD_AREAS.find((a) => a.value === form.area)?.hint}>
        <select className="select" value={form.area} onChange={(e) => set("area", e.target.value)}>
          {FIELD_AREAS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      </Field>

      {form.type === "SELECT" && (
        <div className="sm:col-span-2">
          <Field label="گزینه‌ها" required hint="هر گزینه در یک خط.">
            <textarea className="textarea" value={options} onChange={(e) => setOptions(e.target.value)} required />
          </Field>
        </div>
      )}

      <Field label="متن راهنما"><input className="input" value={form.helpText} onChange={(e) => set("helpText", e.target.value)} /></Field>
      <Field label="مقدار پیش‌فرض"><input className="input" value={form.defaultValue} onChange={(e) => set("defaultValue", e.target.value)} /></Field>

      <label className="flex cursor-pointer items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" className="custom-checkbox" checked={form.required}
               onChange={(e) => set("required", e.target.checked)} />
        پر کردن این فیلد الزامی است
      </label>

      {error && <p role="alert" className="error-text sm:col-span-2">{error}</p>}

      <div className="flex justify-end gap-2 sm:col-span-2">
        <button type="button" className="btn" onClick={onCancel}>انصراف</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "در حال ذخیره…" : "افزودن فیلد"}</button>
      </div>
    </form>
  );
}
