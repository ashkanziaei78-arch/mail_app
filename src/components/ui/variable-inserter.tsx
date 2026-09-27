"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { fillWithExamples, insertVariable, type LetterVariable } from "@/lib/render";

/**
 * دکمه‌های درج متغیر + پیش‌نمایش با مقدار نمونه.
 *
 * `targetRef` به همان textarea اشاره می‌کند که متن در آن نوشته می‌شود؛ متغیر
 * دقیقاً سر جای مکان‌نما درج می‌شود، نه ته متن. فاصله دو طرف هم خودکار اضافه
 * می‌گردد (insertVariable).
 */
export default function VariableInserter({
  variables, value, onChange, targetRef, renderHtml = false,
}: {
  variables: readonly LetterVariable[];
  value: string;
  onChange: (value: string) => void;
  targetRef: React.RefObject<HTMLTextAreaElement | null>;
  /** متن قالب HTML است و پیش‌نمایش باید رندر شود، نه به‌صورت متن خام دیده شود */
  renderHtml?: boolean;
}) {
  const [showPreview, setShowPreview] = useState(true);

  function insert(token: string) {
    const element = targetRef.current;
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? value.length;
    const next = insertVariable(value, start, end, token);
    onChange(next.text);
    // بعد از رندر دوباره، مکان‌نما را پشت متغیر درج‌شده می‌گذاریم تا تایپ ادامه پیدا کند.
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(next.caret, next.caret);
    });
  }

  const preview = fillWithExamples(value, variables);

  return (
    <div className="space-y-2">
      <fieldset>
        <legend className="label">متغیرها — روی هرکدام کلیک کنید تا سر جای مکان‌نما درج شود</legend>
        <div className="flex flex-wrap gap-1.5">
          {variables.map((variable) => (
            <button
              key={variable.token} type="button" className="chip chip-action"
              title={`${variable.description} — نمونه: ${variable.example}`}
              onClick={() => insert(variable.token)}
            >
              <span dir="ltr">{variable.token}</span>
            </button>
          ))}
        </div>
        <p className="hint mt-1.5">
          فاصلهٔ قبل و بعد خودکار گذاشته می‌شود، پس «آقای{"{{نام}}"}» نمی‌شود.
        </p>
      </fieldset>

      <div>
        <button type="button" className="btn btn-sm" onClick={() => setShowPreview((s) => !s)}>
          {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showPreview ? "بستن پیش‌نمایش" : "پیش‌نمایش با مقدار نمونه"}
        </button>
        {showPreview && (
          <>
            <p className="hint mt-2">
              این همان چیزی است که مخاطب می‌بیند؛ مقدارها نمونه‌اند و هنگام ارسال با اطلاعات واقعی هر نفر جایگزین می‌شوند.
            </p>
            {renderHtml ? (
              <div
                className="card letter-body mt-1 max-h-56 overflow-y-auto bg-white p-4 text-black"
                dangerouslySetInnerHTML={{ __html: preview }}
              />
            ) : (
              <p className="card mt-1 whitespace-pre-wrap p-3 text-sm leading-7">{preview || "—"}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
