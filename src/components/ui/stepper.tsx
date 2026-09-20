const STEPS = ["اطلاعات کمپین", "انتخاب مخاطبین", "فهرست نهایی", "متن نامه", "پیش‌نمایش", "پیامک و ارسال"];

/** نوار مراحل ساخت کمپین — وضعیت جاری با رنگ و متن (نه فقط رنگ) مشخص می‌شود. */
export default function Stepper({ current, onSelect }: { current: number; onSelect?: (step: number) => void }) {
  return (
    <ol className="card flex flex-wrap items-center gap-x-1 gap-y-2 p-3" aria-label={`مرحله ${current} از ${STEPS.length}`}>
      {STEPS.map((label, index) => {
        const step = index + 1;
        const state = step === current ? "current" : step < current ? "done" : "todo";
        const content = (
          <span className="flex items-center gap-2">
            <span
              className="tnum grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold"
              style={
                state === "current"
                  ? { background: "var(--primary)", color: "var(--primary-text)" }
                  : state === "done"
                    ? { background: "var(--success-bg)", color: "var(--success)" }
                    : { background: "var(--surface-2)", color: "var(--muted)" }
              }
            >
              {state === "done" ? "✓" : step}
            </span>
            <span className={state === "current" ? "font-bold" : ""} style={state === "todo" ? { color: "var(--muted)" } : undefined}>
              {label}
            </span>
          </span>
        );
        return (
          <li key={label} className="flex items-center gap-1" aria-current={state === "current" ? "step" : undefined}>
            {onSelect && step <= current ? (
              <button type="button" onClick={() => onSelect(step)} className="rounded-lg px-2 py-1 text-sm hover:bg-black/5">{content}</button>
            ) : (
              <span className="px-2 py-1 text-sm">{content}</span>
            )}
            {step < STEPS.length && <span aria-hidden="true" style={{ color: "var(--border)" }}>—</span>}
          </li>
        );
      })}
    </ol>
  );
}
