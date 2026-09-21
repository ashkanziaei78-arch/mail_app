"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * روی عنصر بومی <dialog> ساخته شده است: Esc برای بستن، حبس فوکوس داخل دیالوگ،
 * بازگرداندن فوکوس به عنصر قبلی و inert شدن بقیه صفحه را خود مرورگر می‌دهد —
 * بدون کتابخانه و بدون پیاده‌سازی دستی focus trap.
 */
export default function Modal({
  title, description, onClose, children, footer, size = "md",
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    // Esc پیش‌فرض دیالوگ را به همان onClose وصل می‌کنیم تا وضعیت React هم به‌روز شود
    const onCancel = (event: Event) => { event.preventDefault(); onClose(); };
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [onClose]);

  const width = { sm: "max-w-sm", md: "max-w-2xl", lg: "max-w-4xl" }[size];

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      aria-describedby={description ? "modal-description" : undefined}
      className={`m-auto w-[calc(100vw-2rem)] ${width} rounded-2xl bg-transparent p-0 backdrop:bg-black/60 backdrop:backdrop-blur-sm`}
      // کلیک روی پس‌زمینه (خود عنصر dialog، نه کارت داخلش) می‌بندد
      onClick={(event) => { if (event.target === ref.current) onClose(); }}
    >
      <div className="card max-h-[90dvh] overflow-y-auto p-5" dir="rtl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="modal-title" className="text-lg font-bold">{title}</h2>
            {description && (
              <p id="modal-description" className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{description}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="btn btn-sm shrink-0" aria-label="بستن پنجره">
            <X className="h-4 w-4" />
          </button>
        </div>

        {children}

        {footer && <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </dialog>
  );
}
