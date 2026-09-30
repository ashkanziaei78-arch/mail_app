"use client";

import { useState } from "react";
import { Field } from "./primitives";
import { useToast } from "./toast";
import JalaliDateInput from "./jalali-date-input";

export type FieldDefinition = {
  id: string;
  key: string;
  label: string;
  type: "TEXT" | "TEXTAREA" | "RICH_TEXT" | "DATE" | "NUMBER" | "SELECT" | "SIGNATURE" | "SIGNER_NAME" | "IMAGE" | "TABLE" | "ATTACHMENTS";
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

  // این دو کادر خودکار پر می‌شوند و جای پر کردن ندارند
  if (field.type === "SIGNER_NAME" || field.type === "ATTACHMENTS") {
    return (
      <Field
        label={field.label}
        hint={field.type === "SIGNER_NAME"
          ? "از «نام و سمت امضاکننده» همین نامه برداشته می‌شود."
          : "نام فایل‌های پیوست همین نامه خودکار اینجا فهرست می‌شود."}
      >
        <div className="rounded-xl border border-dashed p-2 text-xs" style={{ color: "var(--muted)" }}>
          {value || "خودکار پر می‌شود"}
        </div>
      </Field>
    );
  }

  if (field.type === "IMAGE" || field.type === "TABLE") {
    return <UploadField field={field} value={value} onChange={onChange} disabled={disabled} />;
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

/**
 * کادر تصویر و کادر جدول: هر دو با آپلود فایل پر می‌شوند.
 * تصویر نشانی فایل را نگه می‌دارد و جدول، HTML ساخته‌شده از اکسل را.
 */
function UploadField({ field, value, onChange, disabled }: {
  field: FieldDefinition;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const isImage = field.type === "IMAGE";

  async function upload(file: File) {
    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(isImage ? "/api/letters/media" : "/api/letters/table", { method: "POST", body: form });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { toast("error", json.error); return; }
    onChange(isImage ? json.data.path : json.data.html);
    toast("success", isImage ? "تصویر ثبت شد." : "جدول ساخته شد.");
  }

  return (
    <Field
      label={field.label}
      hint={isImage ? "PNG، JPG یا WEBP تا ۴ مگابایت." : "فایل اکسل یا CSV؛ ردیف اول سرستون در نظر گرفته می‌شود."}
      required={field.required}
    >
      <div className="space-y-2">
        {value && (
          isImage
            ? // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="max-h-28 rounded-lg border" />
            : <div className="max-h-40 overflow-auto rounded-lg border p-2 text-xs" dangerouslySetInnerHTML={{ __html: value }} />
        )}
        <div className="flex gap-2">
          <label className="btn btn-sm" aria-disabled={disabled || busy}>
            {value ? "جایگزینی فایل" : isImage ? "آپلود تصویر" : "آپلود اکسل"}
            <input
              type="file"
              accept={isImage ? "image/png,image/jpeg,image/webp" : ".xlsx,.csv,.txt"}
              hidden
              disabled={disabled || busy}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
            />
          </label>
          {value && !disabled && (
            <button type="button" className="btn btn-sm btn-danger" onClick={() => onChange("")}>حذف</button>
          )}
        </div>
      </div>
    </Field>
  );
}
