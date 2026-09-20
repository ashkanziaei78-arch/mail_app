"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { Badge, EmptyState, Field, PageHeader } from "@/components/ui/primitives";
import { faNumber } from "@/lib/jalali";

type Tag = { id: string; name: string; color: string | null; count: number };
type Group = { id: string; name: string; type: string; count: number };

export default function TagsClient({ tags, groups, contacts, canWrite }: {
  tags: Tag[];
  groups: Group[];
  contacts: Array<{ id: string; name: string }>;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [newTag, setNewTag] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState<{ open: boolean; type: "MANUAL" | "SMART" }>({ open: false, type: "MANUAL" });

  async function call(url: string, init: RequestInit, onOk: () => void) {
    setError(null);
    const res = await fetch(url, init);
    const json = await res.json();
    if (!json.ok) { setError(json.error); return; }
    onOk();
    router.refresh();
  }

  return (
    <>
      <PageHeader title="برچسب‌ها و گروه‌ها" description="با برچسب، مخاطبین را دسته‌بندی کنید و هنگام ساخت کمپین بر اساس آن‌ها فیلتر بگیرید." />
      {error && <p role="alert" className="mb-4 rounded-xl px-4 py-3 text-sm font-semibold" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>{error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-3 font-bold">برچسب‌ها</h2>

          {canWrite && (
            <form
              className="mb-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTag.trim()) return;
                call("/api/tags", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ name: newTag }),
                }, () => setNewTag(""));
              }}
            >
              <label htmlFor="newTag" className="sr-only">نام برچسب جدید</label>
              <input id="newTag" className="input" placeholder="مثال: مدیران_استان" value={newTag} onChange={(e) => setNewTag(e.target.value)} />
              <button className="btn btn-primary shrink-0" type="submit"><Plus className="h-4 w-4" />برچسب جدید</button>
            </form>
          )}

          {tags.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>هنوز برچسبی ساخته نشده است.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <li key={t.id} className="flex items-center gap-1 rounded-full px-3 py-1 text-sm" style={{ background: "var(--surface-2)" }}>
                  <span className="font-semibold">#{t.name}</span>
                  <span className="tnum text-xs" style={{ color: "var(--muted)" }}>({faNumber(t.count)})</span>
                  {canWrite && (
                    <button
                      aria-label={`حذف برچسب ${t.name}`}
                      className="rounded-full p-1 hover:bg-black/10"
                      onClick={() => confirm(`برچسب #${t.name} حذف شود؟ مخاطبین حذف نمی‌شوند.`) &&
                        call(`/api/tags/${t.id}`, { method: "DELETE" }, () => {})}
                    >
                      <Trash2 className="h-3.5 w-3.5" style={{ color: "var(--danger)" }} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">گروه‌های هوشمند و دستی</h2>
            {canWrite && (
              <button className="btn btn-sm btn-primary" onClick={() => setGroupForm({ open: true, type: "MANUAL" })}>
                <Plus className="h-4 w-4" />گروه جدید
              </button>
            )}
          </div>

          {groups.length === 0 ? (
            <EmptyState title="گروهی وجود ندارد" description="گروه دستی یعنی فهرست ثابتی از مخاطبین؛ گروه هوشمند یعنی فیلتری که هر بار تازه‌سازی می‌شود." />
          ) : (
            <table className="table">
              <caption className="sr-only">گروه‌های مخاطبین</caption>
              <thead><tr><th>نام گروه</th><th>نوع</th><th>تعداد</th><th><span className="sr-only">عملیات</span></th></tr></thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.id}>
                    <td className="font-semibold">{g.name}</td>
                    <td><Badge tone={g.type === "SMART" ? "info" : "neutral"}>{g.type === "SMART" ? "هوشمند" : "دستی"}</Badge></td>
                    <td className="tnum">{faNumber(g.count)}</td>
                    <td>
                      <span className="flex gap-1">
                        {canWrite && g.type === "SMART" && (
                          <button className="btn btn-sm" aria-label={`تازه‌سازی گروه ${g.name}`}
                                  onClick={() => call(`/api/groups/${g.id}`, { method: "POST" }, () => {})}>
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
                        {canWrite && (
                          <button className="btn btn-sm btn-danger" aria-label={`حذف گروه ${g.name}`}
                                  onClick={() => confirm(`گروه «${g.name}» حذف شود؟`) && call(`/api/groups/${g.id}`, { method: "DELETE" }, () => {})}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {groupForm.open && (
        <GroupDialog
          tags={tags}
          contacts={contacts}
          onClose={() => setGroupForm({ open: false, type: "MANUAL" })}
          onSaved={() => { setGroupForm({ open: false, type: "MANUAL" }); router.refresh(); }}
        />
      )}
    </>
  );
}

function GroupDialog({ tags, contacts, onClose, onSaved }: {
  tags: Tag[];
  contacts: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"MANUAL" | "SMART">("MANUAL");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [tagMode, setTagMode] = useState<"AND" | "OR">("OR");
  const [contactIds, setContactIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, type, contactIds, filter: { tagIds, tagMode } }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { setError(json.error); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-label="گروه جدید">
      <form onSubmit={submit} className="card max-h-[92dvh] w-full max-w-lg space-y-4 overflow-y-auto p-5">
        <h2 className="text-lg font-bold">گروه جدید</h2>

        <Field label="نام گروه" required><input className="input" required value={name} onChange={(e) => setName(e.target.value)} /></Field>

        <Field label="نوع گروه" hint={type === "SMART" ? "اعضا از روی برچسب‌ها محاسبه می‌شوند و بعداً قابل تازه‌سازی‌اند." : "فهرست ثابتی از مخاطبین انتخاب‌شده."}>
          <select className="select" value={type} onChange={(e) => setType(e.target.value as "MANUAL" | "SMART")}>
            <option value="MANUAL">دستی</option>
            <option value="SMART">هوشمند (بر اساس برچسب)</option>
          </select>
        </Field>

        {type === "SMART" ? (
          <>
            <Field label="شرط ترکیب برچسب‌ها">
              <select className="select" value={tagMode} onChange={(e) => setTagMode(e.target.value as "AND" | "OR")}>
                <option value="OR">هر کدام از برچسب‌ها (OR)</option>
                <option value="AND">همه برچسب‌ها همزمان (AND)</option>
              </select>
            </Field>
            <fieldset>
              <legend className="label">برچسب‌ها</legend>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <label key={t.id} className="btn btn-sm cursor-pointer">
                    <input type="checkbox" className="custom-checkbox" checked={tagIds.includes(t.id)}
                           onChange={(e) => setTagIds(e.target.checked ? [...tagIds, t.id] : tagIds.filter((i) => i !== t.id))} />
                    #{t.name}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        ) : (
          <Field label="مخاطبین گروه" hint="برای انتخاب چندتایی، Ctrl یا Cmd را نگه دارید.">
            <select multiple className="select h-48" value={contactIds}
                    onChange={(e) => setContactIds([...e.target.selectedOptions].map((o) => o.value))}>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        )}

        {error && <p role="alert" className="error-text">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>انصراف</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "در حال ذخیره…" : "ساخت گروه"}</button>
        </div>
      </form>
    </div>
  );
}
