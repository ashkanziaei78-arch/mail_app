"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronRight, ChevronLeft } from "lucide-react";
import {
  FA_MONTHS, FA_WEEKDAYS_SHORT, formatJalaliInput, gregorianToJalali,
  jalaliMonthLength, jalaliToGregorian, jalaliWeekday, parseJalali, toFaDigits,
} from "@/lib/jalali";

/**
 * ورودی تاریخ شمسی: هم می‌شود تایپ کرد (۱۴۰۴/۰۶/۲۹ با ارقام فارسی یا لاتین)
 * هم از تقویم انتخاب کرد. مقدار بیرونی همیشه ISO میلادی است تا سمت سرور
 * تبدیل لازم نباشد.
 */
export default function JalaliDateInput({
  value, onChange, id, name, required, disabled, placeholder = "۱۴۰۴/۰۶/۲۹",
  ...rest
}: {
  value: string | null;                 // ISO: 2025-09-20
  onChange: (iso: string | null) => void;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "id">) {
  const selected = value ? new Date(value) : null;
  const [text, setText] = useState(() => (selected ? toFaDigits(formatJalaliInput(selected)) : ""));
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => gregorianToJalali(selected ?? new Date()));
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(value ? toFaDigits(formatJalaliInput(new Date(value))) : "");
  }, [value]);

  // کلیک بیرون یا Esc تقویم را می‌بندد
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function commitText(raw: string) {
    setText(raw);
    if (!raw.trim()) { onChange(null); return; }
    const parsed = parseJalali(raw);
    if (parsed) {
      onChange(toIso(parsed));
      setCursor(gregorianToJalali(parsed));
    }
  }

  const grid = useMemo(() => {
    const firstDay = jalaliToGregorian({ year: cursor.year, month: cursor.month, day: 1 });
    const leading = jalaliWeekday(new Date(firstDay.year, firstDay.month - 1, firstDay.day));
    const length = jalaliMonthLength(cursor.year, cursor.month);
    return { leading, length };
  }, [cursor.year, cursor.month]);

  const todayJalali = gregorianToJalali(new Date());
  const selectedJalali = selected ? gregorianToJalali(selected) : null;
  const invalid = text.trim().length > 0 && !parseJalali(text);

  function shiftMonth(delta: number) {
    let { year, month } = cursor;
    month += delta;
    if (month < 1) { month = 12; year -= 1; }
    if (month > 12) { month = 1; year += 1; }
    setCursor({ year, month, day: 1 });
  }

  function pick(day: number) {
    const g = jalaliToGregorian({ year: cursor.year, month: cursor.month, day });
    onChange(toIso(new Date(g.year, g.month - 1, g.day)));
    setOpen(false);
  }

  return (
    <div ref={wrapper} className="relative" {...rest}>
      <input
        id={id}
        className="input tnum pl-11"
        inputMode="numeric"
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id ?? name}-date-error` : undefined}
        onChange={(event) => commitText(event.target.value)}
        onFocus={() => setOpen(true)}
      />
      {name && <input type="hidden" name={name} value={value ?? ""} />}

      <button
        type="button"
        className="absolute inset-y-0 left-1 my-auto grid h-9 w-9 place-items-center rounded-lg"
        style={{ color: "var(--muted)" }}
        aria-label={open ? "بستن تقویم" : "باز کردن تقویم شمسی"}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <CalendarDays className="h-4 w-4" />
      </button>

      {invalid && (
        <p id={`${id ?? name}-date-error`} className="error-text" role="alert">
          تاریخ معتبر نیست. نمونه درست: ۱۴۰۴/۰۶/۲۹
        </p>
      )}

      {open && !disabled && (
        <div
          className="card absolute z-50 mt-1 w-72 p-3 shadow-xl"
          role="dialog"
          aria-label={`تقویم ${FA_MONTHS[cursor.month - 1]} ${toFaDigits(cursor.year)}`}
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" className="btn btn-sm" onClick={() => shiftMonth(-1)} aria-label="ماه قبل">
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="font-bold">
              {FA_MONTHS[cursor.month - 1]} {toFaDigits(cursor.year)}
            </span>
            <button type="button" className="btn btn-sm" onClick={() => shiftMonth(1)} aria-label="ماه بعد">
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {FA_WEEKDAYS_SHORT.map((day, index) => (
              <span key={day} className="py-1 text-xs font-bold"
                    style={{ color: index === 6 ? "var(--danger)" : "var(--muted)" }}>
                {day}
              </span>
            ))}

            {Array.from({ length: grid.leading }).map((_, i) => <span key={`pad-${i}`} />)}

            {Array.from({ length: grid.length }).map((_, i) => {
              const day = i + 1;
              const isSelected =
                selectedJalali?.year === cursor.year && selectedJalali.month === cursor.month && selectedJalali.day === day;
              const isToday =
                todayJalali.year === cursor.year && todayJalali.month === cursor.month && todayJalali.day === day;
              const isFriday = (grid.leading + i) % 7 === 6;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => pick(day)}
                  aria-label={`${toFaDigits(day)} ${FA_MONTHS[cursor.month - 1]} ${toFaDigits(cursor.year)}`}
                  aria-current={isToday ? "date" : undefined}
                  aria-pressed={isSelected}
                  className="tnum grid h-8 place-items-center rounded-lg text-sm"
                  style={
                    isSelected
                      ? { background: "var(--primary)", color: "var(--primary-text)", fontWeight: 700 }
                      : isToday
                        ? { border: "1px solid var(--primary)", color: "var(--primary)", fontWeight: 700 }
                        : isFriday
                          ? { color: "var(--danger)" }
                          : undefined
                  }
                >
                  {toFaDigits(day)}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex justify-between">
            <button type="button" className="btn btn-sm" onClick={() => { onChange(null); setText(""); setOpen(false); }}>
              پاک کردن
            </button>
            <button type="button" className="btn btn-sm" onClick={() => { onChange(toIso(new Date())); setOpen(false); }}>
              امروز
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** تاریخ محلی → YYYY-MM-DD بدون تغییر منطقه زمانی (toISOString روز را جابه‌جا می‌کرد) */
function toIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
