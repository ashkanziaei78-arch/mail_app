"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FieldDefinition } from "./dynamic-field";
import { faDate } from "@/lib/jalali";

export type BoxGeometry = { x: number; y: number; width: number; height: number };

const MIN_SIZE = 3; // درصد — کوچک‌تر از این، کادر قابل گرفتن نیست

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** گوشه‌ها و لبه‌هایی که می‌شود از آن‌ها کادر را تغییر اندازه داد. */
const HANDLES = [
  { id: "nw", cursor: "nwse-resize", style: { top: -5, insetInlineStart: -5 } },
  { id: "ne", cursor: "nesw-resize", style: { top: -5, insetInlineEnd: -5 } },
  { id: "sw", cursor: "nesw-resize", style: { bottom: -5, insetInlineStart: -5 } },
  { id: "se", cursor: "nwse-resize", style: { bottom: -5, insetInlineEnd: -5 } },
] as const;

type DragState =
  | { kind: "move"; id: string; grabX: number; grabY: number; start: BoxGeometry }
  | { kind: "resize"; id: string; handle: string; originX: number; originY: number; start: BoxGeometry };

/**
 * بوم سربرگ: کادرهای متن روی تصویر سربرگ، مثل پاورپوینت.
 *
 * مختصات‌ها درصدی‌اند (۰ تا ۱۰۰ نسبت به ابعاد تصویر)، نه پیکسل — تصویر سربرگ در
 * ویرایشگر کوچک دیده می‌شود ولی در چاپ بزرگ است؛ با درصد، کادر در هر دو حالت سرِ
 * جای خودش می‌ماند. اندازه فونت هم نسبت به عرض مرجع ۸۰۰ پیکسل مقیاس می‌خورد تا
 * پیش‌نمایش با خروجی نهایی یکی باشد.
 */
export default function LetterheadCanvas({
  imageUrl, fields, selectedId, onSelect, onGeometryChange, readOnly, values,
}: {
  imageUrl: string;
  fields: FieldDefinition[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onGeometryChange: (id: string, geometry: BoxGeometry) => void;
  readOnly?: boolean;
  /** مقدار نمایشی داخل هر کادر (پیش‌نمایش). اگر نباشد، برچسب فیلد نشان داده می‌شود. */
  values?: Record<string, string>;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [surfaceWidth, setSurfaceWidth] = useState(800);

  useEffect(() => {
    const element = surfaceRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSurfaceWidth(entry.contentRect.width || 800));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /** مختصات نشانگر را به درصدِ ابعاد بوم تبدیل می‌کند. */
  const toPercent = useCallback((clientX: number, clientY: number) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: ((clientX - rect.left) / rect.width) * 100, y: ((clientY - rect.top) / rect.height) * 100 };
  }, []);

  useEffect(() => {
    if (!drag) return;

    function move(event: PointerEvent) {
      if (!drag) return;
      const point = toPercent(event.clientX, event.clientY);
      if (drag.kind === "move") {
        onGeometryChange(drag.id, {
          ...drag.start,
          x: clamp(point.x - drag.grabX, 0, 100 - drag.start.width),
          y: clamp(point.y - drag.grabY, 0, 100 - drag.start.height),
        });
        return;
      }
      const dx = point.x - drag.originX;
      const dy = point.y - drag.originY;
      const next = { ...drag.start };
      // در RTL، «west» همان سمت راستِ دیده‌شده است؛ ولی مختصات x همیشه از چپ تصویر
      // شمرده می‌شود، پس محاسبه را روی همان دستگاه چپ‌به‌راست نگه می‌داریم.
      if (drag.handle.includes("w")) {
        const right = drag.start.x + drag.start.width;
        next.x = clamp(drag.start.x + dx, 0, right - MIN_SIZE);
        next.width = right - next.x;
      } else {
        next.width = clamp(drag.start.width + dx, MIN_SIZE, 100 - drag.start.x);
      }
      if (drag.handle.includes("n")) {
        const bottom = drag.start.y + drag.start.height;
        next.y = clamp(drag.start.y + dy, 0, bottom - MIN_SIZE);
        next.height = bottom - next.y;
      } else {
        next.height = clamp(drag.start.height + dy, MIN_SIZE, 100 - drag.start.y);
      }
      onGeometryChange(drag.id, next);
    }

    function up() { setDrag(null); }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [drag, onGeometryChange, toPercent]);

  /** با صفحه‌کلید هم بشود کادر را جابه‌جا/تغییر اندازه داد (بدون ماوس هم قابل استفاده باشد). */
  function onKeyDown(event: React.KeyboardEvent, field: FieldDefinition) {
    if (readOnly) return;
    const step = event.shiftKey ? 5 : 1;
    const geometry = { x: field.x, y: field.y, width: field.width, height: field.height };
    const resize = event.altKey;
    let handled = true;
    switch (event.key) {
      case "ArrowRight":
        if (resize) geometry.width = clamp(geometry.width + step, MIN_SIZE, 100 - geometry.x);
        else geometry.x = clamp(geometry.x + step, 0, 100 - geometry.width);
        break;
      case "ArrowLeft":
        if (resize) geometry.width = clamp(geometry.width - step, MIN_SIZE, 100);
        else geometry.x = clamp(geometry.x - step, 0, 100 - geometry.width);
        break;
      case "ArrowDown":
        if (resize) geometry.height = clamp(geometry.height + step, MIN_SIZE, 100 - geometry.y);
        else geometry.y = clamp(geometry.y + step, 0, 100 - geometry.height);
        break;
      case "ArrowUp":
        if (resize) geometry.height = clamp(geometry.height - step, MIN_SIZE, 100);
        else geometry.y = clamp(geometry.y - step, 0, 100 - geometry.height);
        break;
      default:
        handled = false;
    }
    if (!handled) return;
    event.preventDefault();
    onGeometryChange(field.id, geometry);
  }

  return (
    <div
      ref={surfaceRef}
      className="relative w-full select-none overflow-hidden rounded-xl border bg-white"
      onPointerDown={(e) => { if (e.target === e.currentTarget) onSelect(null); }}
    >
      {/* تصویر سربرگ، مبنای نسبت ابعاد بوم است */}
      <img src={imageUrl} alt="سربرگ" className="pointer-events-none block w-full" draggable={false} />

      {fields.map((field) => {
        const active = field.id === selectedId;
        const scale = surfaceWidth / 800; // اندازه فونت نسبت به عرض مرجع
        const raw = values?.[field.key] ?? "";
        // تاریخ در داده ISO میلادی است ولی روی سربرگ باید شمسی دیده شود —
        // همان تبدیلی که هنگام تولید نامه نهایی هم انجام می‌شود.
        const content = field.type === "DATE" && raw ? faDate(raw) : raw;
        return (
          <div
            key={field.id}
            role="button"
            tabIndex={readOnly ? -1 : 0}
            aria-label={`کادر ${field.label}`}
            aria-pressed={active}
            onKeyDown={(e) => onKeyDown(e, field)}
            onPointerDown={(e) => {
              if (readOnly) return;
              e.stopPropagation();
              onSelect(field.id);
              const point = toPercent(e.clientX, e.clientY);
              setDrag({
                kind: "move", id: field.id,
                grabX: point.x - field.x, grabY: point.y - field.y,
                start: { x: field.x, y: field.y, width: field.width, height: field.height },
              });
            }}
            className="absolute"
            style={{
              insetInlineStart: undefined,
              left: `${field.x}%`,
              top: `${field.y}%`,
              width: `${field.width}%`,
              height: `${field.height}%`,
              cursor: readOnly ? "default" : "move",
              outline: active ? "2px solid var(--brand-600)" : "1px dashed rgba(37,99,235,.55)",
              background: active ? "rgba(37,99,235,.08)" : "transparent",
              touchAction: "none",
            }}
          >
            <div
              className="pointer-events-none h-full w-full overflow-hidden px-1"
              style={{
                fontFamily: `${field.fontFamily}, Vazirmatn, sans-serif`,
                fontSize: `${Math.max(7, field.fontSize * scale)}px`,
                fontWeight: Number(field.fontWeight),
                color: field.color,
                textAlign: field.align as React.CSSProperties["textAlign"],
                lineHeight: field.lineHeight,
                direction: "rtl",
              }}
            >
              {(field.type === "SIGNATURE" || field.type === "IMAGE") && content ? (
                <img src={content} alt="" className="h-full w-full object-contain" />
              ) : content ? (
                field.type === "RICH_TEXT" || field.type === "TABLE"
                  ? <span dangerouslySetInnerHTML={{ __html: content }} />
                  : content
              ) : (
                <span style={{ opacity: 0.55 }}>{field.label}</span>
              )}
            </div>

            {active && !readOnly && HANDLES.map((handle) => (
              <span
                key={handle.id}
                role="presentation"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  const point = toPercent(e.clientX, e.clientY);
                  setDrag({
                    kind: "resize", id: field.id, handle: handle.id,
                    originX: point.x, originY: point.y,
                    start: { x: field.x, y: field.y, width: field.width, height: field.height },
                  });
                }}
                className="absolute h-2.5 w-2.5 rounded-full border-2 border-white"
                style={{ ...handle.style, background: "var(--brand-600)", cursor: handle.cursor, touchAction: "none" }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
