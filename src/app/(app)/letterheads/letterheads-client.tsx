"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Star, Trash2 } from "lucide-react";
import { Badge, EmptyState, Field, PageHeader } from "@/components/ui/primitives";
import Modal from "@/components/ui/modal";
import { useConfirm, useToast } from "@/components/ui/toast";
import { LETTER_VARIABLES } from "@/lib/render";

type Letterhead = { id: string; name: string; fileUrl: string; isDefault: boolean; status: string; version: number };
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
                    <p className="text-xs" style={{ color: "var(--muted)" }}>نسخه {l.version}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge tone={l.status === "ACTIVE" ? "success" : "neutral"}>{l.status === "ACTIVE" ? "فعال" : "غیرفعال"}</Badge>
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
