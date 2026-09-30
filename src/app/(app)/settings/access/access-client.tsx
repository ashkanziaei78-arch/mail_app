"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { PERMISSION_GROUPS, PERMISSION_LABELS, type PermissionCode } from "@/lib/rbac";

type AccessUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  roleLabel: string;
  /** پیش‌فرض نقش — برای نشان دادن اینکه کدام تیک دستی عوض شده */
  byRole: PermissionCode[];
  codes: PermissionCode[];
};

/**
 * صفحه دسترسی‌ها: مدیر برای هر کاربر تعیین می‌کند کدام بخش‌های منو باز باشد.
 *
 * هر تیک یک مجوز است و منو دقیقاً بر اساس همین مجوزها ساخته می‌شود؛ بخشی که
 * کاربر مجوزش را ندارد نه در منو می‌بیند و نه با نشانی مستقیم باز می‌شود
 * (همان بررسی روی سرور هم انجام می‌شود).
 */
export default function AccessClient({ users, currentUserId }: { users: AccessUser[]; currentUserId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [selectedId, setSelectedId] = useState(users.find((u) => u.id !== currentUserId)?.id ?? users[0]?.id ?? "");
  const selected = users.find((u) => u.id === selectedId);
  const [codes, setCodes] = useState<PermissionCode[]>(selected?.codes ?? []);
  const [dirtyFor, setDirtyFor] = useState<string>(selectedId);
  const [busy, setBusy] = useState(false);

  // با عوض شدن کاربر، تیک‌ها باید از نو از همان کاربر خوانده شوند
  const current = useMemo(() => {
    if (dirtyFor === selectedId) return codes;
    return selected?.codes ?? [];
  }, [codes, dirtyFor, selectedId, selected]);

  function toggle(code: PermissionCode) {
    const next = current.includes(code) ? current.filter((c) => c !== code) : [...current, code];
    setCodes(next);
    setDirtyFor(selectedId);
  }

  function resetToRole() {
    if (!selected) return;
    setCodes(selected.byRole);
    setDirtyFor(selectedId);
  }

  async function save() {
    if (!selected) return;
    setBusy(true);
    const res = await fetch(`/api/users/${selected.id}/permissions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ codes: current }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { toast("error", json.error); return; }
    toast("success", `دسترسی‌های ${selected.fullName} ذخیره شد.`);
    router.refresh();
  }

  return (
    <>
      <PageHeader
        title="دسترسی‌ها"
        description="برای هر کاربر مشخص کنید کدام بخش‌ها را ببیند. تیکی که با پیش‌فرض نقشش فرق دارد با برچسب «دستی» نشان داده می‌شود."
      />

      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <nav aria-label="کاربران">
          <ul className="space-y-2">
            {users.map((u) => (
              <li key={u.id}>
                <button
                  className="choice-card w-full text-right"
                  data-selected={u.id === selectedId}
                  onClick={() => { setSelectedId(u.id); setCodes(u.codes); setDirtyFor(u.id); }}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{u.fullName}</span>
                    <span className="block truncate text-xs" style={{ color: "var(--muted)" }}>
                      {u.roleLabel}{u.id === currentUserId ? " — خودتان" : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {selected ? (
          <section className="card space-y-5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-bold">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                {selected.fullName}
              </h2>
              <button className="btn btn-sm" onClick={resetToRole} disabled={busy}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />بازگشت به پیش‌فرض نقش
              </button>
            </div>

            {selected.id === currentUserId && (
              <p className="rounded-xl px-3 py-2 text-sm" style={{ background: "var(--warn-bg)", color: "var(--warn)" }}>
                این حساب خودتان است؛ برای جلوگیری از قفل‌شدن بیرون از سامانه، دسترسی‌های خودتان از اینجا تغییر نمی‌کند.
              </p>
            )}

            {PERMISSION_GROUPS.map((group) => (
              <fieldset key={group.title}>
                <legend className="mb-2 text-sm font-bold">{group.title}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.codes.map((code) => {
                    const checked = current.includes(code);
                    const manual = checked !== selected.byRole.includes(code);
                    return (
                      <label key={code} className="flex items-center gap-2 rounded-xl border p-2.5 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={checked}
                          disabled={selected.id === currentUserId}
                          onChange={() => toggle(code)}
                        />
                        <span className="min-w-0 flex-1 truncate">{PERMISSION_LABELS[code]}</span>
                        {manual && (
                          <span className="chip" style={{ color: "var(--info)" }}>دستی</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            <div className="flex justify-end">
              <button className="btn btn-primary" onClick={save} disabled={busy || selected.id === currentUserId}>
                {busy ? "در حال ذخیره…" : "ذخیره دسترسی‌ها"}
              </button>
            </div>
          </section>
        ) : (
          <p className="card p-5 text-sm">کاربری برای تنظیم دسترسی وجود ندارد.</p>
        )}
      </div>
    </>
  );
}
