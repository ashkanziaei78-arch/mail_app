"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, FileSpreadsheet, Pencil, Plus, Search, Trash2, Upload, XCircle } from "lucide-react";
import { Badge, EmptyState, Field, PageHeader } from "@/components/ui/primitives";
import Modal from "@/components/ui/modal";
import { useConfirm, useToast } from "@/components/ui/toast";
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
  contacts, tags, initialFilters, pagination, canWrite, canDelete,
}: {
  contacts: ContactRow[];
  tags: Array<{ id: string; name: string }>;
  initialFilters: { q: string; book: string; tag: string; status: string };
  pagination: { page: number; pageSize: number; total: number };
  canWrite: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState(initialFilters);
  const [editing, setEditing] = useState<ContactRow | null>(null);
  const [importing, setImporting] = useState(false);

  function applyFilters(next: typeof filters, page = 1) {
    setFilters(next);
    const params = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => v && params.set(k, v));
    if (page > 1) params.set("page", String(page));
    startTransition(() => router.push(`/contacts?${params}`));
  }

  const lastPage = Math.max(1, Math.ceil(pagination.total / pagination.pageSize));
  const firstRow = (pagination.page - 1) * pagination.pageSize + 1;
  const lastRow = Math.min(pagination.page * pagination.pageSize, pagination.total);

  async function remove(contact: ContactRow) {
    const ok = await confirm({
      title: `حذف ${contact.firstName} ${contact.lastName}`,
      body: "این مخاطب از فهرست برداشته می‌شود. سابقه کمپین‌های قبلی و نامه‌های ارسال‌شده دست‌نخورده می‌ماند.",
      confirmLabel: "حذف مخاطب",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.ok) { toast("error", json.error); return; }
    toast("success", "مخاطب حذف شد.");
    router.refresh();
  }

  return (
    <>
      <PageHeader
        title="دفترچه مخاطبین"
        description="دفترچه عمومی برای همه کاربران سازمان قابل مشاهده است؛ دفترچه خصوصی فقط برای خودتان."
        action={
          canWrite && (
            <div className="flex flex-wrap gap-2">
              <a href="/api/contacts/export" className="btn btn-sm"><Download className="h-4 w-4" />خروجی اکسل</a>
              <button className="btn btn-sm" onClick={() => setImporting(true)}><Upload className="h-4 w-4" />ورود گروهی</button>
              <button className="btn btn-primary btn-sm" onClick={() => setEditing(EMPTY)}><Plus className="h-4 w-4" />مخاطب جدید</button>
            </div>
          )
        }
      />

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

      {pagination.total > 0 && (
        <nav className="mt-4 flex flex-wrap items-center justify-between gap-3" aria-label="صفحه‌بندی مخاطبین">
          <p className="tnum text-sm" style={{ color: "var(--muted)" }}>
            نمایش {firstRow.toLocaleString("fa-IR")} تا {lastRow.toLocaleString("fa-IR")} از{" "}
            {pagination.total.toLocaleString("fa-IR")} مخاطب
          </p>
          {lastPage > 1 && (
            <div className="flex items-center gap-2">
              <button className="btn btn-sm" disabled={pagination.page <= 1 || pending}
                      onClick={() => applyFilters(filters, pagination.page - 1)}>
                صفحه قبل
              </button>
              <span className="tnum text-sm">
                صفحه {pagination.page.toLocaleString("fa-IR")} از {lastPage.toLocaleString("fa-IR")}
              </span>
              <button className="btn btn-sm" disabled={pagination.page >= lastPage || pending}
                      onClick={() => applyFilters(filters, pagination.page + 1)}>
                صفحه بعد
              </button>
            </div>
          )}
        </nav>
      )}

      {editing && (
        <ContactDialog
          contact={editing}
          tags={tags}
          onClose={() => setEditing(null)}
          onSaved={(text) => { setEditing(null); toast("success", text); router.refresh(); }}
        />
      )}

      {importing && <ImportDialog onClose={() => setImporting(false)} onDone={(text) => { setImporting(false); toast("success", text); router.refresh(); }} />}
      {confirmDialog}
    </>
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
    <Modal title={isNew ? "مخاطب جدید" : "ویرایش مخاطب"} onClose={onClose}>
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
    </Modal>
  );
}

function ImportDialog({ onClose, onDone }: { onClose: () => void; onDone: (message: string) => void }) {
  const [result, setResult] = useState<{ created: number; failed: number; total: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/contacts/import", { method: "POST", body: new FormData(event.currentTarget) });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { setError(json.error); return; }
    setResult(json.data);
    if (json.data.failed === 0) onDone(`${json.data.created.toLocaleString("fa-IR")} مخاطب وارد شد.`);
  }

  return (
    <Modal
      title="ورود گروهی مخاطبین از اکسل"
      description="فایل اکسل (xlsx) یا CSV را بارگذاری کنید. راهنمای تصویری هر مرحله پایین‌تر است."
      size="lg"
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-5">
        <ol className="space-y-4">
          <GuideStep
            number={1}
            title="فایل نمونه را دانلود کنید"
            body="سرستون‌های درست از قبل داخلش هست. داده خودتان را زیر همان سرستون‌ها بنویسید تا ستونی جا نیفتد. (همین پنجره را از دکمه «ورود گروهی» در بالای دفترچه باز کرده‌اید.)"
            image="/guide/import-1-template.png"
            imageAlt="نوار بالای دفترچه مخاطبین با دکمه‌های مخاطب جدید، ورود گروهی و خروجی اکسل"
          >
            <a href="/api/contacts/template" className="btn btn-primary btn-sm">
              <FileSpreadsheet className="h-4 w-4" />
              دانلود فایل نمونه اکسل
            </a>
          </GuideStep>

          <GuideStep
            number={2}
            title="در اکسل پرش کنید"
            body="سطر دوم فقط نمونه است؛ پاکش کنید. ستون «نام» و «نام خانوادگی» الزامی‌اند — بقیه اختیاری. شماره همراه را با صفر ابتدایی بنویسید."
            image="/guide/import-2-excel.png"
            imageAlt="نمای فایل نمونه اکسل با سرستون‌های فارسی و یک سطر داده"
          />

          <GuideStep
            number={3}
            title="فایل را همین‌جا بارگذاری کنید"
            body="اگر برچسبی در ستون «برچسب‌ها» نوشته باشید که از قبل در سامانه ساخته شده، خودکار به مخاطب می‌چسبد. بعد از وارد کردن، مخاطبین این‌طور در فهرست می‌نشینند:"
            image="/guide/import-3-upload.png"
            imageAlt="فهرست مخاطبین پس از ورود گروهی، با ستون‌های نام، سازمان، شماره همراه و برچسب‌ها"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="فایل اکسل یا CSV" required hint="حداکثر ۸ مگابایت">
                <input
                  className="input" type="file" name="file" required
                  accept=".xlsx,.xlsm,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
                />
              </Field>
              <Field label="در کدام دفترچه ثبت شود؟" hint="خصوصی یعنی فقط خودتان می‌بینید.">
                <select className="select" name="visibility" defaultValue="PUBLIC">
                  <option value="PUBLIC">دفترچه عمومی سازمان</option>
                  <option value="PRIVATE">دفترچه خصوصی من</option>
                </select>
              </Field>
            </div>
            {fileName && (
              <p className="hint flex items-center gap-1">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                فایل انتخاب‌شده: <span className="font-semibold">{fileName}</span>
              </p>
            )}
          </GuideStep>
        </ol>

        <details className="rounded-xl border p-3">
          <summary className="cursor-pointer text-sm font-semibold">ستون‌های قابل استفاده</summary>
          <p className="hint mt-2">
            نام، نام خانوادگی، عنوان، موبایل، تلفن ثابت، ایمیل، سازمان، سمت، رسته شغلی،
            استان، شهر، آدرس، توضیحات، برچسب‌ها.
          </p>
          <p className="hint">
            اگر نام و نام خانوادگی در یک ستون باشد، سرستون را «نام و نام خانوادگی» بگذارید؛
            خودکار تفکیک می‌شود.
          </p>
        </details>

        {error && <p role="alert" className="error-text">{error}</p>}

        {result && (
          <div className="rounded-xl border p-3 text-sm">
            <p className="flex flex-wrap items-center gap-2 font-bold">
              {result.failed === 0
                ? <CheckCircle2 className="h-4 w-4" style={{ color: "var(--success)" }} />
                : <XCircle className="h-4 w-4" style={{ color: "var(--warn)" }} />}
              <span>از {result.total.toLocaleString("fa-IR")} سطر:</span>
              <Badge tone="success">{result.created.toLocaleString("fa-IR")} وارد شد</Badge>
              {result.failed > 0 && <Badge tone="danger">{result.failed.toLocaleString("fa-IR")} رد شد</Badge>}
            </p>
            {result.errors.length > 0 && (
              <>
                <p className="mt-2 font-semibold">سطرهای ردشده (بقیه سطرها وارد شده‌اند):</p>
                <ul className="mt-1 max-h-40 list-inside list-disc space-y-1 overflow-y-auto" tabIndex={0}
                    style={{ color: "var(--danger)" }}>
                  {result.errors.map((e) => <li key={e}>{e}</li>)}
                </ul>
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>بستن</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "در حال پردازش…" : "وارد کردن"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** یک مرحله از راهنمای تصویری: شماره، توضیح، تصویر و در صورت نیاز کنترل‌های همان مرحله. */
function GuideStep({ number, title, body, image, imageAlt, children }: {
  number: number;
  title: string;
  body: string;
  image: string;
  imageAlt: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="rounded-xl border p-4">
      <div className="mb-2 flex items-start gap-3">
        <span className="tnum grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold"
              style={{ background: "var(--primary)", color: "var(--primary-text)" }}>
          {number.toLocaleString("fa-IR")}
        </span>
        <div>
          <p className="font-bold">{title}</p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>{body}</p>
        </div>
      </div>

      <img
        src={image}
        alt={imageAlt}
        loading="lazy"
        width={1200}
        height={520}
        className="mb-3 w-full rounded-lg border"
        style={{ background: "var(--surface-2)" }}
      />

      {children}
    </li>
  );
}
