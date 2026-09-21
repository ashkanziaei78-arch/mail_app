import Link from "next/link";
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{description}</p>}
      </div>
      {action}
    </header>
  );
}

const TONES = {
  neutral: { bg: "var(--surface-2)", fg: "var(--muted)" },
  success: { bg: "var(--success-bg)", fg: "var(--success)" },
  danger: { bg: "var(--danger-bg)", fg: "var(--danger)" },
  warn: { bg: "var(--warn-bg)", fg: "var(--warn)" },
  info: { bg: "var(--info-bg)", fg: "var(--info)" },
} as const;

export type Tone = keyof typeof TONES;

/** نشان وضعیت — رنگ + متن؛ هرگز فقط رنگ (قاعده color-not-only) */
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  const t = TONES[tone];
  return <span className="badge" style={{ background: t.bg, color: t.fg }}>{children}</span>;
}

export function StatCard({ label, value, hint, href }: { label: string; value: string; hint?: string; href?: string }) {
  const content = (
    <div className="card h-full p-4">
      <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="tnum mt-2 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>{hint}</p>}
    </div>
  );
  return href ? <Link href={href} className="block transition-transform hover:-translate-y-0.5">{content}</Link> : content;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-10 text-center">
      <p className="font-bold">{title}</p>
      <p className="max-w-md text-sm" style={{ color: "var(--muted)" }}>{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/**
 * برچسب فرم را واقعاً به کنترل وصل می‌کند: شناسه تولید و روی فرزند ست می‌شود.
 * (پیش‌تر label و input فقط کنار هم بودند و axe آن را «فیلد بدون برچسب» می‌دید —
 * یعنی خواننده صفحه اسم فیلد را نمی‌خواند.)
 */
export function Field({ label, hint, error, required, children }: {
  label: string; hint?: string; error?: string; required?: boolean; children: ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = [hint && !error ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id: (children.props as { id?: string }).id ?? id,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": error ? true : undefined,
        "aria-required": required || undefined,
      })
    : children;

  return (
    <div>
      <label className="label" htmlFor={isValidElement(children) ? ((children.props as { id?: string }).id ?? id) : undefined}>
        {label}
        {required && <span style={{ color: "var(--danger)" }} aria-hidden="true"> *</span>}
        {required && <span className="sr-only"> (الزامی)</span>}
      </label>
      {control}
      {hint && !error && <p id={hintId} className="hint">{hint}</p>}
      {error && <p id={errorId} className="error-text" role="alert">{error}</p>}
    </div>
  );
}
