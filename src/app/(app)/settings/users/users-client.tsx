"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Plus } from "lucide-react";
import { Badge, Field, PageHeader } from "@/components/ui/primitives";
import { ROLE_LABELS } from "@/lib/rbac";
import { faDateTime } from "@/lib/jalali";

type Row = {
  id: string; fullName: string; email: string; role: string; status: string;
  departmentId: string | null; departmentName: string | null; lastLoginAt: string | null;
};

const ASSIGNABLE = ["ORG_ADMIN", "DEPT_ADMIN", "APPROVER", "USER"] as const;

export default function UsersClient({ users, departments, logs, currentUserId }: {
  users: Row[];
  departments: Array<{ id: string; name: string }>;
  logs: Array<{ id: string; action: string; entityType: string; user: string; createdAt: string; ipAddress: string | null }>;
  currentUserId: string;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  async function patch(id: string, data: Record<string, unknown>, okText: string) {
    setMessage(null);
    const res = await fetch(`/api/users/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
    const json = await res.json();
    setMessage(json.ok ? { tone: "ok", text: okText } : { tone: "err", text: json.error });
    if (json.ok) router.refresh();
  }

  return (
    <>
      <PageHeader
        title="کاربران و نقش‌ها"
        description="مدیر سازمان برای همکاران حساب می‌سازد و سطح دسترسی هرکدام را تعیین می‌کند."
        action={<button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />کاربر جدید</button>}
      />

      {message && (
        <p role="alert" className="mb-4 rounded-xl px-4 py-3 text-sm font-semibold"
           style={{ background: message.tone === "ok" ? "var(--success-bg)" : "var(--danger-bg)", color: message.tone === "ok" ? "var(--success)" : "var(--danger)" }}>
          {message.text}
        </p>
      )}

      <div className="card mb-6 overflow-x-auto">
        <table className="table">
          <caption className="sr-only">کاربران سازمان</caption>
          <thead><tr><th>نام</th><th>ایمیل</th><th>نقش</th><th>واحد</th><th>آخرین ورود</th><th>وضعیت</th><th><span className="sr-only">عملیات</span></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-semibold">{u.fullName}{u.id === currentUserId && <span className="ms-2"><Badge tone="info">شما</Badge></span>}</td>
                <td dir="ltr">{u.email}</td>
                <td>
                  {u.role === "SUPER_ADMIN" ? (
                    <Badge tone="warn">{ROLE_LABELS.SUPER_ADMIN}</Badge>
                  ) : (
                    <select className="select" aria-label={`نقش ${u.fullName}`} value={u.role}
                            onChange={(e) => patch(u.id, { role: e.target.value }, "نقش به‌روزرسانی شد.")}>
                      {ASSIGNABLE.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  )}
                </td>
                <td>
                  <select className="select" aria-label={`واحد ${u.fullName}`} value={u.departmentId ?? ""}
                          onChange={(e) => patch(u.id, { departmentId: e.target.value || null }, "واحد به‌روزرسانی شد.")}>
                    <option value="">بدون واحد</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </td>
                <td className="tnum">{u.lastLoginAt ? faDateTime(u.lastLoginAt) : "—"}</td>
                <td><Badge tone={u.status === "ACTIVE" ? "success" : "neutral"}>{u.status === "ACTIVE" ? "فعال" : "غیرفعال"}</Badge></td>
                <td>
                  <span className="flex gap-1">
                    <button className="btn btn-sm" aria-label={`تغییر گذرواژه ${u.fullName}`} onClick={() => {
                      const password = prompt(`گذرواژه جدید برای ${u.fullName} (حداقل ۸ کاراکتر):`);
                      if (password) patch(u.id, { password }, "گذرواژه تغییر کرد.");
                    }}><KeyRound className="h-4 w-4" /></button>
                    {u.id !== currentUserId && u.role !== "SUPER_ADMIN" && (
                      <button className="btn btn-sm" onClick={() => patch(u.id, { status: u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }, "وضعیت کاربر تغییر کرد.")}>
                        {u.status === "ACTIVE" ? "غیرفعال کردن" : "فعال کردن"}
                      </button>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="card p-4">
        <h2 className="mb-3 font-bold">تاریخچه فعالیت‌های حساس</h2>
        <div className="max-h-96 overflow-y-auto">
          <table className="table">
            <caption className="sr-only">آخرین رویدادهای ثبت‌شده</caption>
            <thead><tr><th>زمان</th><th>کاربر</th><th>عملیات</th><th>موجودیت</th><th>IP</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="tnum">{faDateTime(l.createdAt)}</td>
                  <td>{l.user}</td>
                  <td dir="ltr">{l.action}</td>
                  <td dir="ltr">{l.entityType}</td>
                  <td className="tnum" dir="ltr">{l.ipAddress ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {adding && <AddUserDialog departments={departments} onClose={() => setAdding(false)}
                                onSaved={() => { setAdding(false); setMessage({ tone: "ok", text: "کاربر جدید ساخته شد." }); router.refresh(); }} />}
    </>
  );
}

function AddUserDialog({ departments, onClose, onSaved }: {
  departments: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/users", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fullName: form.get("fullName"), email: form.get("email"), password: form.get("password"),
        role: form.get("role"), departmentId: form.get("departmentId") || null,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { setError(json.error); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-label="کاربر جدید">
      <form onSubmit={submit} className="card w-full max-w-lg space-y-4 p-5">
        <h2 className="text-lg font-bold">کاربر جدید</h2>
        <Field label="نام کامل" required><input className="input" name="fullName" required /></Field>
        <Field label="ایمیل" required><input className="input" dir="ltr" type="email" name="email" required autoComplete="off" /></Field>
        <Field label="گذرواژه اولیه" required hint="حداقل ۸ کاراکتر. کاربر پس از ورود باید آن را تغییر دهد.">
          <input className="input" dir="ltr" type="text" name="password" minLength={8} required autoComplete="new-password" />
        </Field>
        <Field label="نقش" required>
          <select className="select" name="role" required defaultValue="USER">
            {ASSIGNABLE.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </Field>
        <Field label="واحد سازمانی">
          <select className="select" name="departmentId" defaultValue="">
            <option value="">بدون واحد</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        {error && <p role="alert" className="error-text">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>انصراف</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "در حال ساخت…" : "ساخت کاربر"}</button>
        </div>
      </form>
    </div>
  );
}
