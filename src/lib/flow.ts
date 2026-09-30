/**
 * تبدیل وضعیت یک نامه و مراحل تأییدش به نمودار خطی «نامه الان کجاست».
 *
 * تابع خالص است تا هم در سرور (صفحه تأییدها) و هم در کلاینت (ویزارد) یک شکل
 * بدهد؛ منطق وضعیت یک جا می‌ماند و دو جا از هم جدا نمی‌افتد.
 */
export type FlowState = "done" | "current" | "todo" | "failed";
export type FlowNode = { key: string; label: string; sub?: string; state: FlowState };

export type FlowApproval = {
  id: string;
  order: number;
  status: string;
  positionName: string;
  approverName?: string | null;
};

export function campaignFlow(status: string, approvals: FlowApproval[]): FlowNode[] {
  const rejected = status === "DRAFT" && approvals.some((a) => a.status === "REJECTED");
  const nodes: FlowNode[] = [
    {
      key: "draft",
      label: "پیش‌نویس",
      sub: rejected ? "برگشت خورده" : undefined,
      state: rejected ? "failed" : status === "DRAFT" ? "current" : "done",
    },
  ];

  const firstPending = Math.min(
    ...approvals.filter((a) => a.status === "PENDING").map((a) => a.order),
    Number.POSITIVE_INFINITY,
  );

  if (approvals.length === 0) {
    // سازمان بدون گردش کار: یک مرحله تأیید ساده
    nodes.push({
      key: "approve",
      label: "تأیید",
      state:
        status === "PENDING_APPROVAL" ? "current"
        : status === "DRAFT" ? "todo"
        : "done",
    });
  } else {
    for (const a of [...approvals].sort((x, y) => x.order - y.order)) {
      nodes.push({
        key: a.id,
        label: a.positionName,
        sub: a.approverName ?? undefined,
        state:
          a.status === "APPROVED" ? "done"
          : a.status === "REJECTED" ? "failed"
          : status === "PENDING_APPROVAL" && a.order === firstPending ? "current"
          : "todo",
      });
    }
  }

  nodes.push({
    key: "send",
    label: "ارسال پیامک",
    state:
      status === "COMPLETED" ? "done"
      : status === "PROCESSING" ? "current"
      : status === "APPROVED" ? "current"
      : status === "CANCELLED" ? "failed"
      : "todo",
  });

  return nodes;
}
