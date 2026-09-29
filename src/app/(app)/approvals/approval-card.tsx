"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Eye, X } from "lucide-react";
import FlowGraph from "@/components/ui/flow-graph";
import { Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import type { FlowNode } from "@/lib/flow";
import { faDateTime, faNumber } from "@/lib/jalali";

export type PendingCampaign = {
  id: string;
  name: string;
  subject: string | null;
  createdBy: string;
  departmentName: string | null;
  updatedAt: string;
  recipients: number;
  confidential: boolean;
  currentStep: string | null;
  flow: FlowNode[];
};

/**
 * کارت یک نامهٔ منتظر تأیید: مسیر نامه را نشان می‌دهد و تأیید/رد را همین‌جا
 * انجام می‌دهد. تا پیش از این باید وارد ویزارد شش‌مرحله‌ای می‌شدی و دکمه تأیید
 * ته مرحله ششم بود؛ کار ساده‌ای که چند کلیک می‌برد.
 */
export default function ApprovalCard({ campaign }: { campaign: PendingCampaign }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  async function decide(action: "approve" | "reject") {
    setBusy(true);
    const res = await fetch(`/api/campaigns/${campaign.id}/actions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(action === "approve" ? { action } : { action, reason }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { toast("error", json.error); return; }
    toast("success", action === "approve" ? "نامه تأیید شد." : "نامه رد شد و به پیش‌نویس برگشت.");
    setRejecting(false);
    router.refresh();
  }

  return (
    <li className="card space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold">{campaign.name}</p>
          <p className="truncate text-xs" style={{ color: "var(--muted)" }}>
            {campaign.createdBy} — {campaign.departmentName ?? "بدون واحد"} — {faDateTime(campaign.updatedAt)}
          </p>
        </div>
        {campaign.confidential && <Badge tone="warn">محرمانه</Badge>}
      </div>

      <FlowGraph nodes={campaign.flow} />

      <p className="text-sm">
        موضوع: {campaign.subject ?? "—"} — <span className="tnum">{faNumber(campaign.recipients)}</span> مخاطب
        {campaign.currentStep && <> — منتظر «{campaign.currentStep}»</>}
      </p>

      {rejecting ? (
        <div className="space-y-2">
          <textarea
            className="textarea h-20"
            placeholder="دلیل رد نامه را بنویسید؛ برای نویسنده نمایش داده می‌شود."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button className="btn btn-sm" onClick={() => setRejecting(false)} disabled={busy}>انصراف</button>
            <button className="btn btn-danger btn-sm" disabled={busy || reason.trim().length === 0} onClick={() => decide("reject")}>
              ثبت رد نامه
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => decide("approve")}>
            <Check className="h-4 w-4" aria-hidden="true" />تأیید
          </button>
          <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => setRejecting(true)}>
            <X className="h-4 w-4" aria-hidden="true" />رد
          </button>
          <Link href={`/campaigns/${campaign.id}`} className="btn btn-sm">
            <Eye className="h-4 w-4" aria-hidden="true" />دیدن متن نامه
          </Link>
        </div>
      )}
    </li>
  );
}
