"use client";

import { useId, useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";

export type PickerOption = { id: string; label: string; note?: string };

/**
 * انتخاب چندتایی با چک‌باکس.
 *
 * جایگزین <select multiple> است. در select چندتایی، انتخاب چند مورد فقط با نگه
 * داشتن Ctrl/Cmd ممکن است و یک کلیک ساده همه انتخاب‌های قبلی را پاک می‌کند —
 * روی موبایل هم اصلاً کار نمی‌کند. اینجا هر ردیف یک چک‌باکس مستقل است: کلیک
 * می‌کنی، انتخاب می‌شود؛ دوباره کلیک می‌کنی، برداشته می‌شود.
 */
export default function MultiPicker({
  options, selected, onChange, label, hint, searchPlaceholder = "جست‌وجو…", emptyText = "موردی برای انتخاب نیست.", height = "h-64",
}: {
  options: PickerOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  label: string;
  hint?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  height?: string;
}) {
  const [query, setQuery] = useState("");
  const listId = useId();
  const searchId = useId();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.label} ${o.note ?? ""}`.toLowerCase().includes(q));
  }, [options, query]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggle(id: string) {
    onChange(selectedSet.has(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  const allVisibleSelected = visible.length > 0 && visible.every((o) => selectedSet.has(o.id));

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={searchId} className="label mb-0">{label}</label>
        {selected.length > 0 && (
          <button type="button" className="text-xs underline" onClick={() => onChange([])}>
            برداشتن همه ({selected.length.toLocaleString("fa-IR")})
          </button>
        )}
      </div>

      <div className="relative mb-2">
        <Search className="pointer-events-none absolute inset-y-0 end-3 my-auto h-4 w-4" aria-hidden="true" style={{ color: "var(--muted)" }} />
        <input
          id={searchId} className="input pe-9" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder} autoComplete="off"
        />
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-center text-sm" style={{ color: "var(--muted)" }}>
          {query ? "چیزی با این جست‌وجو پیدا نشد." : emptyText}
        </p>
      ) : (
        <>
          <div className={`${height} overflow-y-auto rounded-xl border`} role="group" aria-labelledby={listId} tabIndex={0}>
            <p id={listId} className="sr-only">{label}</p>
            <ul className="divide-y">
              {visible.map((option) => {
                const on = selectedSet.has(option.id);
                return (
                  <li key={option.id}>
                    <label className="flex cursor-pointer items-center gap-3 p-2.5 transition-colors hover:bg-[var(--surface-2)]">
                      <input
                        type="checkbox" className="custom-checkbox" checked={on}
                        onChange={() => toggle(option.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{option.label}</span>
                        {option.note && (
                          <span className="block truncate text-xs" style={{ color: "var(--muted)" }}>{option.note}</span>
                        )}
                      </span>
                      {on && <Check className="h-4 w-4 shrink-0" aria-hidden="true" style={{ color: "var(--primary)" }} />}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button" className="btn btn-sm"
              onClick={() => {
                const ids = visible.map((o) => o.id);
                onChange(allVisibleSelected
                  ? selected.filter((s) => !ids.includes(s))
                  : [...new Set([...selected, ...ids])]);
              }}
            >
              {allVisibleSelected ? "برداشتن همهٔ نمایش‌داده‌شده" : "انتخاب همهٔ نمایش‌داده‌شده"}
            </button>
            {hint && <span className="hint">{hint}</span>}
          </div>
        </>
      )}

      {selected.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const option = options.find((o) => o.id === id);
            if (!option) return null;
            return (
              <li key={id}>
                <button type="button" className="chip" onClick={() => toggle(id)} aria-label={`برداشتن ${option.label}`}>
                  {option.label}
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
