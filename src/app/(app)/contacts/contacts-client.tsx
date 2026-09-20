"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { Badge, EmptyState, Field, PageHeader } from "@/components/ui/primitives";
import { VISIBILITY } from "@/lib/labels";
import { faDate } from "@/lib/jalali";

export type ContactRow = {
  id: string; firstName: string; lastName: string; formalTitle: string | null;
  mobilePhone: string | null; landlinePhone: string | null; email: string | null;
  province: string | null; city: string | null; address: string | null; notes: string | null;
  smsConsent: boolean; status: string; visibility: "PUBLIC" | "PRIVATE";
  lastUsedInCampaignAt: string | null;
  organizationName: string; jobTitle: string; jobCategory: string; tagIds: string[];
};

const EMPTY: ContactRow = {
  id: "", firstName: "", lastName: "", formalTitle: "جناب آقای", mobilePhone: "", landlinePhone: "",
  email: "", province: "", city: "", address: "", notes: "", smsConsent: true, status: "ACTIVE",
  visibility: "PUBLIC", lastUsedInCampaignAt: null, organizationName: "", jobTitle: "", jobCategory: "", tagIds: [],
};

export default function ContactsClient({
  contacts, tags, initialFilters, canWrite, canDelete,
}: {
  contacts: ContactRow[];
  tags: Array<{ id: string; name: string }>;
  initialFilters: { q: string; book: string; tag: string; status: string };
  canWrite: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState(initialFilters);
  const [editing, setEditing] = useState<ContactRow | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  function applyFilters(next: typeof filters) {
    setFilters(next);
    const params = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => v && params.set(k, v));
    startTransition(() => router.push(`/contacts?${params}`));
  }

  async function remove(contact: ContactRow) {
    if (!confirm(`مخاطب «${contact.firstName} ${contact.lastName}» حذف شود؟ این مخاطب از فهرست حذف می‌شود ولی سابقه کمپین‌های قبلی باقی می‌ماند.`)) return;
    const res = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
    const json = await res.json();
    setMessage(json.ok ? { tone: "ok", text: "مخاطب حذف شد." } : { tone: "err", text: json.error });
    if (json.ok) router.refresh();
  }

  return (
    <>
      <PageHeader
        title="دفترچه مخاطبین"
        description="دفترچه عمومی برای همه کاربران سازمان قابل مشاهده است؛ دفترچه خصوصی فقط برای خودتان."
        action={
          canWrite && (
            <div className="flex flex-wrap gap-2">
              <a href="/api/contacts/export" className="btn btn-sm"><Download className="h-4 w-4" />خروجی CSV</a>
              <button className="btn btn-sm" onClick={() => setImporting(true)}><Upload className="h-4 w-4" />ورود گروهی</button>
              <button className="btn btn-primary btn-sm" onClick={() => setEditing(EMPTY)}><Plus className="h-4 w-4" />مخاطب جدید</button>
            </div>
          )
        }
      />

      {message && (
        <p role="alert" className="mb-4 rounded-xl px-4 py-3 text-sm font-semibold"
           style={{
             background: message.tone === "ok" ? "var(--success-bg)" : "var(--danger-bg)",
             color: message.tone === "ok" ? "var(--success)" : "var(--danger)",
           }}>
          {message.text}
        </p>
      )}

      <div className="card mb-4 grid gap-3 p-3 md:grid-cols-4">
        <div className="md:col-span-2">
          <label htmlFor="q" className="label">جست‌وجو</label>
          <div className="relative">
            <Search className="pointer-events-none absolute inset-y-0 right-3 my-auto h-4 w-4" style={{ color: "var(--muted)" }} aria-hidden="true" />
            <input
              id="q" className="input pr-9" defaultValue={filters.q} placeholder="نام، شماره همراه، سازمان یا شهر"
              onKeyDown={(e) => e.key === "Enter" && applyFilters({ ...filters, q: (e.target as HTMLInputElement).value })}
            />
          </div>
          <p className="hint">برای جست‌وجو کلید Enter را بزنید.</p>
        </div>
        <div>
          <label htmlFor="book" className="label">دفترچه</label>
          <select id="book" className="select" value={filters.book} onChange={(e) => applyFilters({ ...filters, book: e.target.value })}>
            <option value="">همه</option>
            <option value="PUBLIC">عمومی</option>
            <option value="PRIVATE">خصوصی</option>
          </select>
        </div>
        <div>
          <label htmlFor="tag" className="label">برچسب</label>
          <select id="tag" className="select" value={filters.tag} onChange={(e) => applyFilters({ ...filters, tag: e.target.value })}>
            <option value="">همه</option>
            {tags.map((t) => <option key={t.id} value={t.id}>#{t.name}</option>)}
          </select>
        </div>
      </div>

      {contacts.length === 0 ? (
        <EmptyState
          title="مخاطبی یافت نشد"
          description={filters.q ? "نتیجه‌ای برای این جست‌وجو نبود. عبارت دیگری را امتحان کنید یا فیلترها را پاک کنید." : "هنوز مخاطبی ثبت نشده است. می‌توانید یکی‌یکی اضافه کنید یا فایل CSV را وارد کنید."}
          action={canWrite && <button className="btn btn-primary" onClick={() => setEditing(EMPTY)}>افزودن اولین مخاطب</button>}
        />
      ) : (
        <div className="card overflow-x-auto" aria-busy={pending}>
          <table className="table">
            <caption className="sr-only">فهرست مخاطبین سازمان</caption>
            <thead>
              <tr>
                <th>نام و نام خانوادگی</th><th>سازمان / سمت</th><th>شماره همراه</th>
                <th>برچسب‌ها</th><th>دفترچه</th><th>آخرین استفاده</th><th><span className="sr-only">عملیات</span></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="font-semibold">{c.firstName} {c.lastName}</span>
                    {c.status !== "ACTIVE" && <span className="ms-2"><Badge tone="warn">غیرفعال</Badge></span>}
                    {!c.smsConsent && <span className="ms-2"><Badge tone="danger">بدون رضایت پیامک</Badge></span>}
                  </td>
                  <td>
                    <span className="block">{c.organizationName || "—"}</span>
                    <span className="block text-xs" style={{ color: "var(--muted)" }}>{c.jobTitle}</span>
                  </td>
                  <td className="tnum" dir="ltr">{c.mobilePhone ?? "—"}</td>
                  <td>
                    <span className="flex flex-wrap gap-1">
                      {c.tagIds.map((id) => {
                        const tag = tags.find((t) => t.id === id);
                        return tag ? <Badge key={id} tone="info">#{tag.name}</Badge> : null;
                      })}
                    </span>
                  </td>
                  <td><Badge tone={VISIBILITY[c.visibility].tone}>{VISIBILITY[c.visibility].label}</Badge></td>
                  <td className="tnum">{c.lastUsedInCampaignAt ? faDate(c.lastUsedInCampaignAt) : "—"}</td>
                  <td>
                    <span className="flex gap-1">
                      {canWrite && (
                        <button className="btn btn-sm" onClick={() => setEditing(c)} aria-label={`ویرایش ${c.firstName} ${c.lastName}`}>
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button className="btn btn-sm btn-danger" onClick={() => remove(c)} aria-label={`حذف ${c.firstName} ${c.lastName}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ContactDialog
          contact={editing}
          tags={tags}
          onClose={() => setEditing(null)}
          onSaved={(text) => { setEditing(null); setMessage({ tone: "ok", text }); router.refresh(); }}
        />
      )}

      {importing && <ImportDialog onClose={() => setImporting(false)} onDone={(text) => { setImporting(false); setMessage({ tone: "ok", text }); router.refresh(); }} />}
    </>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="card max-h-[92dvh] w-full max-w-2xl overflow-y-auto p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="btn btn-sm" onClick={onClose}>بستن</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ContactDialog({ contact, tags, onClose, onSaved }: {
  contact: ContactRow;
  tags: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [form, setForm] = useState(contact);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isNew = !contact.id;

  function set<K extends keyof ContactRow>(key: K, value: ContactRow[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(isNew ? "/api/contacts" : `/api/contacts/${contact.id}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, email: form.email || undefined }),
    });
    const json = await res.json();
    setSaving(false);
    if (!json.ok) { setError(json.error); return; }
    onSaved(isNew ? "مخاطب جدید ثبت شد." : "تغییرات ذخیره شد.");
  }

  return (
    <Dialog title={isNew ? "مخاطب جدید" : "ویرایش مخاطب"} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="عنوان خطاب"><select className="select" value={form.formalTitle ?? ""} onChange={(e) => set("formalTitle", e.target.value)}>
          <option value="">—</option><option>جناب آقای</option><option>سرکار خانم</option><option>جناب آقای دکتر</option><option>سرکار خانم دکتر</option><option>جناب آقای مهندس</option><option>سرکار خانم مهندس</option>
        </select></Field>
        <Field label="دفترچه" hint="خصوصی یعنی فقط خودتان این مخاطب را می‌بینید.">
          <select className="select" value={form.visibility} onChange={(e) => set("visibility", e.target.value as "PUBLIC" | "PRIVATE")}>
            <option value="PUBLIC">عمومی سازمان</option><option value="PRIVATE">خصوصی من</option>
          </select>
        </Field>
        <Field label="نام" required><input className="input" required value={form.firstName} onChange={(e) => set("firstName", e.target.value)} /></Field>
        <Field label="نام خانوادگی" required><input className="input" required value={form.lastName} onChange={(e) => set("lastName", e.target.value)} /></Field>
        <Field label="شماره همراه" hint="نمونه: ۰۹۱۲۳۴۵۶۷۸۹ — بدون شماره همراه، پیامکی ارسال نمی‌شود.">
          <input className="input tnum" dir="ltr" inputMode="tel" autoComplete="tel" value={form.mobilePhone ?? ""} onChange={(e) => set("mobilePhone", e.target.value)} />
        </Field>
        <Field label="تلفن ثابت"><input className="input tnum" dir="ltr" inputMode="tel" value={form.landlinePhone ?? ""} onChange={(e) => set("landlinePhone", e.target.value)} /></Field>
        <Field label="ایمیل"><input className="input" type="email" dir="ltr" autoComplete="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="سازمان مخاطب"><input className="input" value={form.organizationName} onChange={(e) => set("organizationName", e.target.value)} /></Field>
        <Field label="سمت"><input className="input" value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} /></Field>
        <Field label="رسته شغلی"><input className="input" value={form.jobCategory} onChange={(e) => set("jobCategory", e.target.value)} /></Field>
        <Field label="استان"><input className="input" value={form.province ?? ""} onChange={(e) => set("province", e.target.value)} /></Field>
        <Field label="شهر"><input className="input" value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} /></Field>

        <div className="sm:col-span-2">
          <Field label="آدرس"><input className="input" value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} /></Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="توضیحات"><textarea className="textarea" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></Field>
        </div>

        <fieldset className="sm:col-span-2">
          <legend className="label">برچسب‌ها</legend>
          <div className="flex flex-wrap gap-2">
            {tags.length === 0 && <p className="hint">هنوز برچسبی ساخته نشده است.</p>}
            {tags.map((t) => (
              <label key={t.id} className="btn btn-sm cursor-pointer" style={form.tagIds.includes(t.id) ? { borderColor: "var(--primary)", color: "var(--primary)" } : undefined}>
                <input
                  type="checkbox" className="custom-checkbox" checked={form.tagIds.includes(t.id)}
                  onChange={(e) => set("tagIds", e.target.checked ? [...form.tagIds, t.id] : form.tagIds.filter((id) => id !== t.id))}
                />
                #{t.name}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="custom-checkbox" checked={form.smsConsent} onChange={(e) => set("smsConsent", e.target.checked)} />
            رضایت دریافت پیامک دارد
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="custom-checkbox" checked={form.status === "ACTIVE"} onChange={(e) => set("status", e.target.checked ? "ACTIVE" : "INACTIVE")} />
            مخاطب فعال است
          </label>
        </div>

        {error && <p role="alert" className="error-text sm:col-span-2">{error}</p>}

        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" className="btn" onClick={onClose}>انصراف</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "در حال ذخیره…" : "ذخیره مخاطب"}</button>
        </div>
      </form>
    </Dialog>
  );
}

function ImportDialog({ onClose, onDone }: { onClose: () => void; onDone: (message: string) => void }) {
  const [result, setResult] = useState<{ created: number; failed: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/contacts/import", { method: "POST", body: new FormData(event.currentTarget) });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { setError(json.error); return; }
    setResult(json.data);
    if (json.data.failed === 0) onDone(`${json.data.created} مخاطب وارد شد.`);
  }

  return (
    <Dialog title="ورود گروهی مخاطبین از CSV" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="rounded-xl p-3 text-sm" style={{ background: "var(--info-bg)", color: "var(--info)" }}>
          ستون‌های قابل استفاده: نام، نام خانوادگی، عنوان، موبایل، تلفن ثابت، ایمیل، سازمان، سمت، رسته شغلی، استان، شهر، آدرس، توضیحات، برچسب‌ها.
          «نام» و «نام خانوادگی» الزامی‌اند. در اکسل فایل را با فرمت «CSV UTF-8» ذخیره کنید.
        </p>
        <Field label="فایل CSV" required><input className="input" type="file" name="file" accept=".csv,text/csv" required /></Field>
        <Field label="در کدام دفترچه ثبت شود؟">
          <select className="select" name="visibility" defaultValue="PUBLIC">
            <option value="PUBLIC">دفترچه عمومی سازمان</option><option value="PRIVATE">دفترچه خصوصی من</option>
          </select>
        </Field>

        {error && <p role="alert" className="error-text">{error}</p>}

        {result && (
          <div className="rounded-xl p-3 text-sm" style={{ background: "var(--surface-2)" }}>
            <p className="font-bold">{result.created} مخاطب وارد شد، {result.failed} سطر رد شد.</p>
            {result.errors.length > 0 && (
              <ul className="mt-2 list-inside list-disc space-y-1" style={{ color: "var(--danger)" }}>
                {result.errors.map((e) => <li key={e}>{e}</li>)}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>بستن</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "در حال پردازش…" : "وارد کردن"}</button>
        </div>
      </form>
    </Dialog>
  );
}
