"use client";

import { Field } from "./primitives";
import JalaliDateInput from "./jalali-date-input";

export type FieldDefinition = {
  id: string;
  key: string;
  label: string;
  type: "TEXT" | "TEXTAREA" | "RICH_TEXT" | "DATE" | "NUMBER" | "SELECT" | "SIGNATURE";
  area: "HEADER" | "BODY" | "FOOTER";
  placeholder: string | null;
  helpText: string | null;
  required: boolean;
  defaultValue: string | null;
  options: string[];
  // جای کادر روی تصویر سربرگ (درصد) و قالب متن داخلش
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  align: string;
  lineHeight: number;
};

export const AREA_LABELS: Record<FieldDefinition["area"], string> = {
  HEADER: "بالای نامه",
  BODY: "داخل متن",
  FOOTER: "پای نامه",
};

/** یک فیلد تعریف‌شده روی سربرگ را بر اساس نوعش رندر می‌کند. */
export default function DynamicField({ field, value, onChange, disabled }: {
  field: FieldDefinition;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const common = { disabled, placeholder: field.placeholder ?? undefined, required: field.required };

  // امضا را کاربر پر نمی‌کند؛ از پروفایل خودش برداشته می‌شود.
  if (field.type === "SIGNATURE") {
    return (
      <Field label={field.label} hint="تصویر امضای شما از پروفایل برداشته می‌شود؛ اینجا چیزی برای پر کردن نیست.">
        <div className="flex h-16 items-center justify-center rounded-xl border border-dashed bg-[var(--surface-2)] p-2">
          {value
            ? <img src={value} alt="امضای شما" className="max-h-full object-contain" />
            : <span className="text-xs" style={{ color: "var(--muted)" }}>هنوز امضایی در پروفایل ثبت نکرده‌اید.</span>}
        </div>
      </Field>
    );
  }

  return (
    <Field label={field.label} hint={field.helpText ?? undefined} required={field.required}>
      {field.type === "DATE" ? (
        <JalaliDateInput value={value || null} onChange={(iso) => onChange(iso ?? "")} disabled={disabled} />
      ) : field.type === "TEXTAREA" ? (
        <textarea className="textarea" value={value} onChange={(e) => onChange(e.target.value)} {...common} />
      ) : field.type === "RICH_TEXT" ? (
        <textarea
          className="textarea h-40 font-mono text-xs"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...common}
        />
      ) : field.type === "SELECT" ? (
        <select className="select" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} required={field.required}>
          <option value="">— انتخاب کنید —</option>
          {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : field.type === "NUMBER" ? (
        <input className="input tnum" type="number" inputMode="numeric" value={value}
               onChange={(e) => onChange(e.target.value)} {...common} />
      ) : (
        <input className="input" value={value} onChange={(e) => onChange(e.target.value)} {...common} />
      )}
    </Field>
  );
}
