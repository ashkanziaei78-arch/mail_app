import { Check, Clock, X } from "lucide-react";
import type { FlowNode } from "@/lib/flow";
import { faNumber } from "@/lib/jalali";

/**
 * نمودار مسیر نامه: «پیش‌نویس ← دبیرخانه ← معاون ← ارسال».
 *
 * چیدمان flex با wrap است، نه grid ثابت: روی موبایل مراحل می‌شکنند و پایین
 * می‌آیند به‌جای اینکه صفحه افقی اسکرول بخورد.
 */
export default function FlowGraph({ nodes }: { nodes: FlowNode[] }) {
  return (
    <ol className="flex flex-wrap items-stretch gap-1.5" aria-label="مسیر نامه">
      {nodes.map((node, index) => {
        const color =
          node.state === "done" ? "var(--success)"
          : node.state === "current" ? "var(--primary)"
          : node.state === "failed" ? "var(--danger)"
          : "var(--muted)";
        const filled = node.state === "current";
        return (
          <li key={node.key} className="flex min-w-0 items-center gap-1.5">
            <div
              className="flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-1.5"
              style={{
                borderColor: color,
                background: filled ? "var(--primary)" : "var(--surface)",
                color: filled ? "var(--primary-text)" : "inherit",
              }}
              aria-current={node.state === "current" ? "step" : undefined}
            >
              <span
                className="tnum grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold"
                style={{ background: filled ? "rgba(255,255,255,.25)" : "var(--surface-2)", color: filled ? "inherit" : color }}
              >
                {node.state === "done" ? <Check className="h-3 w-3" aria-hidden="true" />
                  : node.state === "failed" ? <X className="h-3 w-3" aria-hidden="true" />
                  : node.state === "current" ? <Clock className="h-3 w-3" aria-hidden="true" />
                  : faNumber(index + 1)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold">{node.label}</span>
                {node.sub && (
                  <span className="block truncate text-[10px]" style={{ color: filled ? "inherit" : "var(--muted)" }}>
                    {node.sub}
                  </span>
                )}
              </span>
            </div>
            {index < nodes.length - 1 && (
              <span aria-hidden="true" className="h-px w-3 shrink-0" style={{ background: "var(--border)" }} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
