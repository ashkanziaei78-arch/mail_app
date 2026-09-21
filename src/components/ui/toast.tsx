"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import Modal from "./modal";

type Tone = "success" | "error" | "info" | "warn";
type Toast = { id: number; tone: Tone; text: string };

const ToastContext = createContext<(tone: Tone, text: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const STYLES: Record<Tone, { bg: string; fg: string; Icon: typeof Info }> = {
  success: { bg: "var(--success-bg)", fg: "var(--success)", Icon: CheckCircle2 },
  error: { bg: "var(--danger-bg)", fg: "var(--danger)", Icon: XCircle },
  warn: { bg: "var(--warn-bg)", fg: "var(--warn)", Icon: AlertTriangle },
  info: { bg: "var(--info-bg)", fg: "var(--info)", Icon: Info },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((tone: Tone, text: string) => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, tone, text }]);
    // خطا خودکار بسته نمی‌شود؛ کاربر باید فرصت خواندن و کپی کردنش را داشته باشد
    if (tone !== "error") setTimeout(() => setToasts((l) => l.filter((t) => t.id !== id)), 4500);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* aria-live مؤدبانه: خواننده صفحه پیام را می‌خواند ولی فوکوس را نمی‌دزدد */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => {
          const { bg, fg, Icon } = STYLES[toast.tone];
          return (
            <div
              key={toast.id}
              role={toast.tone === "error" ? "alert" : undefined}
              className="animate-element pointer-events-auto flex w-full max-w-md items-start gap-2 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg"
              style={{ background: bg, color: fg, borderColor: fg }}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{toast.text}</span>
              <button
                type="button"
                onClick={() => setToasts((l) => l.filter((t) => t.id !== toast.id))}
                aria-label="بستن پیام"
                className="shrink-0 rounded p-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/** جایگزین confirm() مرورگر — قابل استایل‌دهی، فارسی و با تأکید روی عمل مخرب. */
export function useConfirm() {
  const [state, setState] = useState<{
    title: string; body: string; confirmLabel: string; destructive: boolean; resolve: (ok: boolean) => void;
  } | null>(null);

  const confirm = useCallback(
    (options: { title: string; body: string; confirmLabel?: string; destructive?: boolean }) =>
      new Promise<boolean>((resolve) => {
        setState({
          title: options.title,
          body: options.body,
          confirmLabel: options.confirmLabel ?? "تأیید",
          destructive: options.destructive ?? false,
          resolve,
        });
      }),
    [],
  );

  const dialog = state ? (
    <ConfirmDialog
      {...state}
      onDone={(ok) => { state.resolve(ok); setState(null); }}
    />
  ) : null;

  return { confirm, dialog };
}

function ConfirmDialog({ title, body, confirmLabel, destructive, onDone }: {
  title: string; body: string; confirmLabel: string; destructive: boolean; onDone: (ok: boolean) => void;
}) {
  return (
    <Modal
      title={title}
      description={body}
      size="sm"
      onClose={() => onDone(false)}
      footer={
        <>
          <button className="btn" onClick={() => onDone(false)}>انصراف</button>
          <button className={destructive ? "btn btn-danger" : "btn btn-primary"} onClick={() => onDone(true)} autoFocus>
            {confirmLabel}
          </button>
        </>
      }
    >
      <span className="sr-only">{body}</span>
    </Modal>
  );
}
