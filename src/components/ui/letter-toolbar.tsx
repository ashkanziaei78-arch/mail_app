"use client";

import { useState } from "react";
import { AlignCenter, AlignJustify, AlignRight, Bold, Image as ImageIcon, SeparatorHorizontal, Table } from "lucide-react";
import { useToast } from "./toast";
import { PAGE_BREAK_HTML } from "@/lib/letter-pages";

/**
 * ابزار متن نامه: چینش، شکست صفحه، درج تصویر و درج جدول از اکسل.
 *
 * متن نامه HTML ساده است؛ این دکمه‌ها همان HTML را سر جای مکان‌نما می‌نویسند.
 * اگر چیزی انتخاب شده باشد، دور همان می‌پیچد؛ وگرنه یک قالب خالی می‌گذارد تا
 * کاربر داخلش بنویسد.
 */
export default function LetterToolbar({ value, onChange, targetRef, disabled }: {
  value: string;
  onChange: (value: string) => void;
  targetRef: React.RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  function apply(before: string, after: string, placeholder = "") {
    const element = targetRef.current;
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || placeholder;
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChange(next);
    // مکان‌نما را بعد از درج، داخل همان قطعه می‌گذاریم
    requestAnimationFrame(() => {
      const caret = start + before.length + selected.length;
      element?.focus();
      element?.setSelectionRange(caret, caret);
    });
  }

  function insert(html: string) {
    apply(html, "");
  }

  async function upload(file: File, kind: "media" | "table") {
    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/letters/${kind}`, { method: "POST", body: form });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { toast("error", json.error); return; }
    if (kind === "media") insert(`<img src="${json.data.path}" alt="" style="width: 60%" />`);
    else insert(json.data.html);
    toast("success", kind === "media" ? "تصویر در متن درج شد." : "جدول در متن درج شد.");
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <button type="button" className="btn btn-sm" disabled={disabled}
              onClick={() => apply('<div style="text-align: justify">', "</div>", "متن")}
              title="تراز از دو طرف">
        <AlignJustify className="h-4 w-4" aria-hidden="true" />تراز دوطرفه
      </button>
      <button type="button" className="btn btn-sm" disabled={disabled}
              onClick={() => apply('<div style="text-align: right">', "</div>", "متن")} title="راست‌چین">
        <AlignRight className="h-4 w-4" aria-hidden="true" />راست‌چین
      </button>
      <button type="button" className="btn btn-sm" disabled={disabled}
              onClick={() => apply('<div style="text-align: center">', "</div>", "متن")} title="وسط‌چین">
        <AlignCenter className="h-4 w-4" aria-hidden="true" />وسط‌چین
      </button>
      <button type="button" className="btn btn-sm" disabled={disabled}
              onClick={() => apply("<strong>", "</strong>", "متن")} title="درشت">
        <Bold className="h-4 w-4" aria-hidden="true" />درشت
      </button>
      <button type="button" className="btn btn-sm" disabled={disabled}
              onClick={() => insert(`\n${PAGE_BREAK_HTML}\n`)} title="ادامه نامه در صفحه بعد">
        <SeparatorHorizontal className="h-4 w-4" aria-hidden="true" />صفحه بعد
      </button>

      <label className="btn btn-sm" aria-disabled={disabled || busy}>
        <ImageIcon className="h-4 w-4" aria-hidden="true" />درج تصویر
        <input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={disabled || busy}
               onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, "media"); e.target.value = ""; }} />
      </label>

      <label className="btn btn-sm" aria-disabled={disabled || busy}>
        <Table className="h-4 w-4" aria-hidden="true" />جدول از اکسل
        <input type="file" accept=".xlsx,.csv,.txt" hidden disabled={disabled || busy}
               onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, "table"); e.target.value = ""; }} />
      </label>
    </div>
  );
}
