"use client";

import { Field } from "./primitives";
import JalaliDateInput from "./jalali-date-input";

export type FieldDefinition = {
  id: string;
  key: string;
  label: string;
  type: "TEXT" | "TEXTAREA" | "RICH_TEXT" | "DATE" | "NUMBER" | "SELECT";
  area: "HEADER" | "BODY" | "FOOTER";
  placeholder: string | null;
  helpText: string | null;
  required: boolean;
  defaultValue: string | null;
  options: string[];
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
