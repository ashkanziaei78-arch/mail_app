"use client";

import { useMemo, useRef, useState } from "react";
import { Hash, Users, X } from "lucide-react";
import { faNumber } from "@/lib/jalali";

export type HashtagOption = {
  id: string;
  name: string;
  count: number;
  kind: "tag" | "group";
};

/**
 * انتخاب گروهی با هشتگ.
 * کاربر `#` می‌زند، نام برچسب یا گروه را می‌نویسد و با Enter کل اعضای آن
 * یک‌جا به فهرست اضافه می‌شود — به‌جای تیک‌زدن تک‌تک ۲۰ نفر.
 */
export default function HashtagPicker({ options, selected, onChange, label = "انتخاب با هشتگ" }: {
  options: HashtagOption[];
  selected: HashtagOption[];
  onChange: (next: HashtagOption[]) => void;
  label?: string;
}) {
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = "hashtag-suggestions";

  const term = query.replace(/^#/, "").trim();
  const matches = useMemo(() => {
    const chosen = new Set(selected.map((s) => `${s.kind}:${s.id}`));
    return options
      .filter((o) => !chosen.has(`${o.kind}:${o.id}`))
      .filter((o) => (term ? o.name.includes(term) : true))
      .slice(0, 8);
  }, [options, selected, term]);

  function add(option: HashtagOption) {
    onChange([...selected, option]);
    setQuery("");
    setHighlight(0);
    inputRef.current?.focus();
  }

  function remove(option: HashtagOption) {
    onChange(selected.filter((s) => !(s.id === option.id && s.kind === option.kind)));
  }

  const totalPeople = selected.reduce((sum, s) => sum + s.count, 0);

  return (
    <div>
      <label htmlFor="hashtag-input" className="label">{label}</label>

      {selected.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {selected.map((option) => (
            <li key={`${option.kind}:${option.id}`}
                className="flex items-center gap-1 rounded-full px-3 py-1 text-sm"
                style={{ background: "var(--info-bg)", color: "var(--info)" }}>
              {option.kind === "group" ? <Users className="h-3.5 w-3.5" /> : <Hash className="h-3.5 w-3.5" />}
              <span className="font-semibold">{option.name}</span>
              <span className="tnum text-xs">({faNumber(option.count)} نفر)</span>
              <button type="button" onClick={() => remove(option)} aria-label={`حذف ${option.name}`} className="rounded-full p-0.5">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <input
          id="hashtag-input"
          ref={inputRef}
          className="input"
          value={query}
          role="combobox"
          aria-expanded={matches.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={matches[highlight] ? `${listId}-${highlight}` : undefined}
          placeholder="# بزنید و نام برچسب یا گروه را بنویسید — مثال: #اتاق_بازرگانی"
          onChange={(e) => { setQuery(e.target.value); setHighlight(0); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") { event.preventDefault(); setHighlight((h) => Math.min(h + 1, matches.length - 1)); }
            else if (event.key === "ArrowUp") { event.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
            else if (event.key === "Enter") {
              event.preventDefault();
              if (matches[highlight]) add(matches[highlight]);
            } else if (event.key === "Backspace" && !query && selected.length) {
              remove(selected[selected.length - 1]);
            }
          }}
        />

        {query.startsWith("#") || term ? (
          <ul id={listId} role="listbox" className="card absolute z-40 mt-1 max-h-64 w-full overflow-y-auto p-1 shadow-xl">
            {matches.length === 0 ? (
              <li className="p-3 text-sm" style={{ color: "var(--muted)" }}>
                برچسب یا گروهی با «{term}» پیدا نشد.
              </li>
            ) : (
              /* گزینه ترکیب‌باکس نباید عنصر قابل فوکوس داخلش داشته باشد (قاعده ARIA)،
                 پس خودِ li قابل کلیک است و پیمایش با صفحه‌کلید روی input انجام می‌شود. */
              matches.map((option, index) => (
                <li
                  key={`${option.kind}:${option.id}`}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === highlight}
                  onMouseDown={(event) => { event.preventDefault(); add(option); }}
                  onMouseEnter={() => setHighlight(index)}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm"
                  style={index === highlight ? { background: "var(--surface-2)" } : undefined}
                >
                  <span className="flex items-center gap-2">
                    {option.kind === "group" ? <Users className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
                    <span className="font-semibold">{option.name}</span>
                    <span className="badge" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
                      {option.kind === "group" ? "گروه" : "برچسب"}
                    </span>
                  </span>
                  <span className="tnum" style={{ color: "var(--muted)" }}>{faNumber(option.count)} نفر</span>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>

      <p className="hint">
        {selected.length === 0
          ? "با ↑ ↓ جابه‌جا شوید و با Enter انتخاب کنید. Backspace آخرین انتخاب را برمی‌دارد."
          : `${faNumber(selected.length)} انتخاب — مجموعاً ${faNumber(totalPeople)} نفر (تکراری‌ها یک بار حساب می‌شوند).`}
      </p>
    </div>
  );
}
