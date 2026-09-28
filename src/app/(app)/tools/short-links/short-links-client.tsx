"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, MousePointerClick } from "lucide-react";
import { EmptyState, Field, PageHeader } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { countSegments } from "@/lib/sms";
import { faDate, faNumber } from "@/lib/jalali";

type ShortLink = {
  id: string; code: string; targetUrl: string; label: string | null; clicks: number; createdAt: string;
};

export default function ShortLinksClient({ links, canWrite }: { links: ShortLink[]; canWrite: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [targetUrl, setTargetUrl] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // origin فقط در مرورگر وجود دارد. خواندن مستقیم آن هنگام رندر، HTML سرور و
  // کلاینت را ناهمسان می‌کند (hydration mismatch)، پس بعد از سوار شدن کامپوننت
  // ست می‌شود.
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const res = await fetch("/api/short-links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetUrl, label: label || null }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { toast("error", json.error); return; }
    setTargetUrl("");
    setLabel("");
    toast("success", "لینک کوتاه ساخته شد.");
    router.refresh();
  }

  async function copy(code: string) {
    await navigator.clipboard.writeText(`${origin}/s/${code}`);
    setCopied(code);
    setTimeout(() => setCopied(null), 1800);
  }

  const saving = targetUrl
    ? countSegments(targetUrl).length - countSegments(`${origin}/s/1234567`).length
    : 0;

  return (
    <>
      <PageHeader
        title="کوتاه‌کننده لینک"
        description="هر نشانی طولانی را به یک لینک کوتاه تبدیل کنید تا در متن پیامک جا شود. لینکِ خودِ نامه‌ها از قبل کوتاه است؛ این ابزار برای بقیه نشانی‌هاست — فرم ثبت‌نام، نقشه محل، فایل و مانند آن."
      />

      {canWrite && (
        <form onSubmit={submit} className="card mb-6 grid gap-3 p-5 sm:grid-cols-[1fr_14rem_auto] sm:items-end">
          <Field label="نشانی کامل" required hint="با http:// یا https:// شروع شود.">
            <input className="input" dir="ltr" required value={targetUrl} type="url"
                   onChange={(e) => setTargetUrl(e.target.value)}
                   placeholder="https://example.com/very/long/registration/form?ref=1404" />
          </Field>
          <Field label="برچسب (اختیاری)" hint="برای اینکه بعداً بشناسیدش.">
            <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="فرم ثبت‌نام همایش" />
          </Field>
          <button className="btn btn-primary" disabled={busy}>
            <Link2 className="h-4 w-4" />{busy ? "در حال ساخت…" : "کوتاه کن"}
          </button>
          {saving > 0 && (
            <p className="hint sm:col-span-3">
              این نشانی {faNumber(saving)} کاراکتر از لینک کوتاه بلندتر است؛ کوتاه کردنش در پیامک فارسی
              (هر بخش ۷۰ کاراکتر) جای محسوسی باز می‌کند.
            </p>
          )}
        </form>
      )}

      {links.length === 0 ? (
        <EmptyState title="هنوز لینکی کوتاه نشده" description="اولین نشانی را در فرم بالا بگذارید تا لینک کوتاهش ساخته شود." />
      ) : (
        <div className="card overflow-x-auto" tabIndex={0} role="region" aria-label="لینک‌های کوتاه">
          <table className="table">
            <caption className="sr-only">لینک‌های کوتاه ساخته‌شده</caption>
            <thead>
              <tr><th>لینک کوتاه</th><th>مقصد</th><th>برچسب</th><th>کلیک</th><th>تاریخ</th></tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id}>
                  <td>
                    <button className="btn btn-sm" onClick={() => copy(link.code)} aria-label={`رونوشت لینک ${link.code}`}>
                      {copied === link.code ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      <span dir="ltr">/s/{link.code}</span>
                    </button>
                  </td>
                  <td className="max-w-xs truncate" dir="ltr" title={link.targetUrl}>{link.targetUrl}</td>
                  <td>{link.label || "—"}</td>
                  <td className="tnum">
                    <span className="inline-flex items-center gap-1">
                      <MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" />
                      {faNumber(link.clicks)}
                    </span>
                  </td>
                  <td className="tnum">{faDate(link.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
