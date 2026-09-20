"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Send, Trash2 } from "lucide-react";
import Stepper from "@/components/ui/stepper";
import { Badge, Field, PageHeader } from "@/components/ui/primitives";
import { CAMPAIGN_STATUS, RECIPIENT_STATUS } from "@/lib/labels";
import { applyVariables, buildContext, LETTER_VARIABLES, SMS_VARIABLES } from "@/lib/render";
import { countSegments } from "@/lib/sms";
import { faNumber } from "@/lib/jalali";

type Recipient = {
  id: string; contactId: string; name: string; formalTitle: string; mobilePhone: string;
  jobTitle: string; contactOrganization: string; city: string;
  status: keyof typeof RECIPIENT_STATUS; errorMessage: string | null; overrideHtml: string | null;
  shortCode: string | null; accessCode: string | null; smsText: string | null; smsStatus: string | null;
};

const DEFAULT_SMS = "{{عنوان}} {{نام_کامل}} گرامی، با سلام و احترام، نامه‌ای از سوی {{سازمان_فرستنده}} برای شما صادر شده است. مشاهده نامه: {{لینک}}";

export default function CampaignWizard({ organizationName, campaign, letter, recipients, options, permissions }: {
  organizationName: string;
  campaign: { id: string; name: string; subject: string | null; status: keyof typeof CAMPAIGN_STATUS; confidentiality: string; smsBodyText: string | null; rejectionReason: string | null; approvedBy: string | null };
  letter: { title: string; letterNumber: string; subject: string; bodyHtml: string; senderName: string; letterheadId: string; letterheadUrl: string | null };
  recipients: Recipient[];
  options: {
    contacts: Array<{ id: string; name: string; organizationName: string; mobilePhone: string }>;
    groups: Array<{ id: string; name: string; count: number }>;
    tags: Array<{ id: string; name: string; count: number }>;
    letterheads: Array<{ id: string; name: string; fileUrl: string }>;
  };
  permissions: { write: boolean; approve: boolean; send: boolean };
}) {
  const router = useRouter();
  const locked = ["PROCESSING", "COMPLETED", "CANCELLED"].includes(campaign.status);
  const [step, setStep] = useState(recipients.length === 0 ? 2 : locked ? 6 : 3);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // انتخاب مخاطبین (مرحله ۲)
  const [contactIds, setContactIds] = useState<string[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [tagMode, setTagMode] = useState<"AND" | "OR">("OR");
  const [search, setSearch] = useState("");

  // متن نامه (مرحله ۴) و پیامک (مرحله ۶)
  const [body, setBody] = useState(letter.bodyHtml);
  const [letterheadId, setLetterheadId] = useState(letter.letterheadId);
  const [senderName, setSenderName] = useState(letter.senderName);
  const [smsText, setSmsText] = useState(campaign.smsBodyText ?? DEFAULT_SMS);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [override, setOverride] = useState<Recipient | null>(null);

  const filteredContacts = useMemo(() => {
    const q = search.trim();
    if (!q) return options.contacts.slice(0, 200);
    return options.contacts.filter((c) => c.name.includes(q) || c.organizationName.includes(q) || c.mobilePhone.includes(q)).slice(0, 200);
  }, [search, options.contacts]);

  async function act(payload: Record<string, unknown>, okText?: string) {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/campaigns/${campaign.id}/actions`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { setMessage({ tone: "err", text: json.error }); return null; }
    if (okText) setMessage({ tone: "ok", text: okText });
    router.refresh();
    return json.data;
  }

  async function saveLetter() {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/campaigns/${campaign.id}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ smsBodyText: smsText, letter: { bodyHtml: body, senderName, letterheadId: letterheadId || null } }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { setMessage({ tone: "err", text: json.error }); return false; }
    router.refresh();
    return true;
  }

  const previewRecipient = recipients[previewIndex];
  const previewContext = previewRecipient
    ? buildContext({
        formalTitle: previewRecipient.formalTitle,
        firstName: previewRecipient.name.split(" ")[0],
        lastName: previewRecipient.name.split(" ").slice(1).join(" "),
        jobTitle: previewRecipient.jobTitle,
        contactOrganization: previewRecipient.contactOrganization,
        city: previewRecipient.city,
        mobilePhone: previewRecipient.mobilePhone,
        senderOrganization: organizationName,
        letterNumber: letter.letterNumber,
        shortLink: previewRecipient.shortCode ? `${location.origin}/l/${previewRecipient.shortCode}` : "https://…/l/xxxxxxxxxx",
        accessCode: previewRecipient.accessCode ?? "",
      })
    : {};

  const smsPreview = applyVariables(smsText, previewContext);
  const segments = countSegments(smsPreview);
  const activeLetterhead = options.letterheads.find((l) => l.id === letterheadId)?.fileUrl ?? letter.letterheadUrl;

  const sent = recipients.filter((r) => r.status === "SMS_SENT" || r.status === "SMS_DELIVERED").length;
  const failed = recipients.filter((r) => r.status === "SMS_FAILED").length;
  const skipped = recipients.filter((r) => r.status === "SKIPPED").length;

  return (
    <>
      <PageHeader
        title={campaign.name}
        description={campaign.subject ?? "بدون موضوع"}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={CAMPAIGN_STATUS[campaign.status].tone}>{CAMPAIGN_STATUS[campaign.status].label}</Badge>
            {campaign.confidentiality === "CONFIDENTIAL" && <Badge tone="warn">محرمانه</Badge>}
            {permissions.write && (
              <button className="btn btn-sm" onClick={async () => {
                const data = await act({ action: "clone" });
                if (data?.id) router.push(`/campaigns/${data.id}`);
              }}><Copy className="h-4 w-4" />رونوشت</button>
            )}
            <Link href="/campaigns" className="btn btn-sm">بازگشت</Link>
          </div>
        }
      />

      {campaign.rejectionReason && (
        <p role="alert" className="mb-4 rounded-xl px-4 py-3 text-sm font-semibold" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
          این کمپین رد شد: {campaign.rejectionReason}
        </p>
      )}
      {message && (
        <p role="alert" className="mb-4 rounded-xl px-4 py-3 text-sm font-semibold"
           style={{ background: message.tone === "ok" ? "var(--success-bg)" : "var(--danger-bg)", color: message.tone === "ok" ? "var(--success)" : "var(--danger)" }}>
          {message.text}
        </p>
      )}

      <Stepper current={step} onSelect={setStep} />

      <div className="mt-4" aria-busy={busy}>
        {/* ---------- مرحله ۲: انتخاب مخاطبین ---------- */}
        {step === 2 && (
          <section className="card space-y-5 p-5">
            <h2 className="font-bold">انتخاب مخاطبین</h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              می‌توانید هم‌زمان افراد مشخص، گروه‌ها و برچسب‌ها را انتخاب کنید؛ نتیجه بدون تکرار ادغام می‌شود.
            </p>

            <div className="grid gap-5 lg:grid-cols-3">
              <Field label="افراد مشخص" hint="برای انتخاب چندتایی، Ctrl یا Cmd را نگه دارید.">
                <input className="input mb-2" placeholder="جست‌وجوی نام، سازمان یا شماره" value={search} onChange={(e) => setSearch(e.target.value)} />
                <select multiple className="select h-56" value={contactIds} onChange={(e) => setContactIds([...e.target.selectedOptions].map((o) => o.value))}>
                  {filteredContacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.organizationName ? ` — ${c.organizationName}` : ""}</option>
                  ))}
                </select>
              </Field>

              <fieldset>
                <legend className="label">گروه‌ها</legend>
                <div className="max-h-56 space-y-1 overflow-y-auto">
                  {options.groups.length === 0 && <p className="hint">گروهی ساخته نشده است.</p>}
                  {options.groups.map((g) => (
                    <label key={g.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-1 text-sm hover:bg-black/5">
                      <input type="checkbox" className="custom-checkbox" checked={groupIds.includes(g.id)}
                             onChange={(e) => setGroupIds(e.target.checked ? [...groupIds, g.id] : groupIds.filter((i) => i !== g.id))} />
                      {g.name} <span className="tnum text-xs" style={{ color: "var(--muted)" }}>({faNumber(g.count)})</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="label">برچسب‌ها</legend>
                <select className="select mb-2" value={tagMode} onChange={(e) => setTagMode(e.target.value as "AND" | "OR")} aria-label="شرط ترکیب برچسب‌ها">
                  <option value="OR">هر کدام از برچسب‌ها (OR)</option>
                  <option value="AND">همه برچسب‌ها همزمان (AND)</option>
                </select>
                <div className="max-h-44 space-y-1 overflow-y-auto">
                  {options.tags.length === 0 && <p className="hint">برچسبی ساخته نشده است.</p>}
                  {options.tags.map((t) => (
                    <label key={t.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-1 text-sm hover:bg-black/5">
                      <input type="checkbox" className="custom-checkbox" checked={tagIds.includes(t.id)}
                             onChange={(e) => setTagIds(e.target.checked ? [...tagIds, t.id] : tagIds.filter((i) => i !== t.id))} />
                      #{t.name} <span className="tnum text-xs" style={{ color: "var(--muted)" }}>({faNumber(t.count)})</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button className="btn" disabled={busy || !permissions.write}
                      onClick={async () => { await act({ action: "setRecipients", contactIds, groupIds, tagIds, tagMode, append: true }, "مخاطبین به فهرست اضافه شدند."); setStep(3); }}>
                افزودن به فهرست فعلی
              </button>
              <button className="btn btn-primary" disabled={busy || !permissions.write}
                      onClick={async () => { await act({ action: "setRecipients", contactIds, groupIds, tagIds, tagMode, append: false }, "فهرست مخاطبین ساخته شد."); setStep(3); }}>
                ساخت فهرست و مرحله بعد
              </button>
            </div>
          </section>
        )}

        {/* ---------- مرحله ۳: فهرست نهایی ---------- */}
        {step === 3 && (
          <section className="card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">فهرست نهایی مخاطبین ({faNumber(recipients.length)} نفر)</h2>
              <div className="flex gap-2">
                <button className="btn btn-sm" onClick={() => setStep(2)}>افزودن مخاطب</button>
                <button className="btn btn-primary btn-sm" onClick={() => setStep(4)} disabled={recipients.length === 0}>مرحله بعد</button>
              </div>
            </div>

            {recipients.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--muted)" }}>هنوز مخاطبی انتخاب نشده است.</p>
            ) : (
              <div className="max-h-[60dvh] overflow-auto">
                <table className="table">
                  <caption className="sr-only">مخاطبین این کمپین</caption>
                  <thead><tr><th>نام</th><th>سازمان / سمت</th><th>شماره همراه</th><th>متن اختصاصی</th><th>وضعیت</th><th><span className="sr-only">حذف</span></th></tr></thead>
                  <tbody>
                    {recipients.map((r) => (
                      <tr key={r.id}>
                        <td className="font-semibold">{r.name}</td>
                        <td>{r.contactOrganization || "—"}<span className="block text-xs" style={{ color: "var(--muted)" }}>{r.jobTitle}</span></td>
                        <td className="tnum" dir="ltr">{r.mobilePhone || <span style={{ color: "var(--danger)" }}>ندارد</span>}</td>
                        <td>
                          {permissions.write && !locked ? (
                            <button className="btn btn-sm" onClick={() => setOverride(r)}>
                              {r.overrideHtml ? "ویرایش متن اختصاصی" : "افزودن متن اختصاصی"}
                            </button>
                          ) : r.overrideHtml ? <Badge tone="info">دارد</Badge> : "—"}
                        </td>
                        <td>
                          <Badge tone={RECIPIENT_STATUS[r.status].tone}>{RECIPIENT_STATUS[r.status].label}</Badge>
                          {r.errorMessage && <span className="block text-xs" style={{ color: "var(--danger)" }}>{r.errorMessage}</span>}
                        </td>
                        <td>
                          {permissions.write && !locked && (
                            <button className="btn btn-sm btn-danger" aria-label={`حذف ${r.name} از کمپین`}
                                    onClick={() => act({ action: "removeRecipient", recipientId: r.id })}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ---------- مرحله ۴: متن نامه ---------- */}
        {step === 4 && (
          <section className="card space-y-4 p-5">
            <h2 className="font-bold">متن نامه</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="سربرگ">
                <select className="select" value={letterheadId} onChange={(e) => setLetterheadId(e.target.value)} disabled={locked}>
                  <option value="">بدون سربرگ</option>
                  {options.letterheads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </Field>
              <Field label="نام و سمت امضاکننده"><input className="input" value={senderName} onChange={(e) => setSenderName(e.target.value)} disabled={locked} placeholder="رضا احمدی — مدیر روابط عمومی" /></Field>
            </div>

            <Field label="متن نامه" required hint="تگ‌های ساده HTML مجازند. متغیرها هنگام تولید نامه با اطلاعات هر مخاطب جایگزین می‌شوند.">
              <textarea className="textarea h-64 font-mono text-xs" value={body} onChange={(e) => setBody(e.target.value)} disabled={locked} />
            </Field>

            <fieldset>
              <legend className="label">درج متغیر</legend>
              <div className="flex flex-wrap gap-2">
                {LETTER_VARIABLES.map((v) => (
                  <button key={v.token} type="button" className="btn btn-sm" title={v.description} disabled={locked}
                          onClick={() => setBody((b) => b + v.token)}>{v.token}</button>
                ))}
              </div>
            </fieldset>

            <div className="flex justify-end gap-2">
              <button className="btn" onClick={() => setStep(3)}>مرحله قبل</button>
              <button className="btn btn-primary" disabled={busy || locked}
                      onClick={async () => { if (await saveLetter()) setStep(5); }}>ذخیره و پیش‌نمایش</button>
            </div>
          </section>
        )}

        {/* ---------- مرحله ۵: پیش‌نمایش ---------- */}
        {step === 5 && (
          <section className="space-y-4">
            <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <h2 className="font-bold">پیش‌نمایش نامه اختصاصی</h2>
                <p className="text-sm" style={{ color: "var(--muted)" }}>نامه هر مخاطب با نام و اطلاعات خودش نمایش داده می‌شود.</p>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="previewFor" className="label mb-0">مخاطب</label>
                <select id="previewFor" className="select w-auto" value={previewIndex} onChange={(e) => setPreviewIndex(Number(e.target.value))}>
                  {recipients.map((r, i) => <option key={r.id} value={i}>{r.name}</option>)}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto pb-4">
              <div className="letter-sheet">
                {activeLetterhead && <img src={activeLetterhead} alt="" className="w-full" />}
                <div className="letter-body" dangerouslySetInnerHTML={{
                  __html: applyVariables(previewRecipient?.overrideHtml ?? body, previewContext),
                }} />
                {senderName && <div className="letter-body pt-0 text-left font-bold">{senderName}</div>}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button className="btn" onClick={() => setStep(4)}>ویرایش متن</button>
              <button className="btn btn-primary" onClick={() => setStep(6)}>تنظیم پیامک</button>
            </div>
          </section>
        )}

        {/* ---------- مرحله ۶: پیامک، تأیید و ارسال ---------- */}
        {step === 6 && (
          <section className="space-y-4">
            <div className="card space-y-4 p-5">
              <h2 className="font-bold">متن پیامک</h2>
              <Field label="متن" required hint="لینک کوتاه و کد دسترسی هنگام ارسال جایگزین می‌شوند.">
                <textarea className="textarea h-28" value={smsText} onChange={(e) => setSmsText(e.target.value)} disabled={locked} />
              </Field>

              <div className="flex flex-wrap gap-2">
                {SMS_VARIABLES.map((v) => (
                  <button key={v.token} type="button" className="btn btn-sm" title={v.description} disabled={locked}
                          onClick={() => setSmsText((t) => t + v.token)}>{v.token}</button>
                ))}
              </div>

              <div className="rounded-xl p-3 text-sm" style={{ background: "var(--surface-2)" }}>
                <p className="mb-1 font-bold">پیش‌نمایش برای {previewRecipient?.name ?? "—"}</p>
                <p className="whitespace-pre-wrap">{smsPreview}</p>
                <p className="tnum mt-2 text-xs" style={{ color: segments.segments > 1 ? "var(--warn)" : "var(--muted)" }}>
                  {faNumber(segments.length)} کاراکتر — {faNumber(segments.segments)} بخش پیامک
                  {segments.unicode && " (فارسی: هر بخش ۷۰ کاراکتر)"}
                  {segments.segments > 1 && " — هزینه به‌ازای هر مخاطب چند برابر می‌شود."}
                </p>
              </div>

              {!locked && (
                <div className="flex flex-wrap justify-end gap-2">
                  <button className="btn" disabled={busy} onClick={saveLetter}>ذخیره پیش‌نویس</button>
                  {permissions.write && campaign.status === "DRAFT" && (
                    <button className="btn btn-primary" disabled={busy || recipients.length === 0}
                            onClick={async () => { if (await saveLetter()) await act({ action: "submit" }, "کمپین برای تأیید ارسال شد."); }}>
                      تولید نامه‌ها و ارسال برای تأیید
                    </button>
                  )}
                  {permissions.approve && campaign.status === "PENDING_APPROVAL" && (
                    <>
                      <button className="btn btn-danger" disabled={busy} onClick={() => {
                        const reason = prompt("دلیل رد نامه؟");
                        if (reason) act({ action: "reject", reason }, "کمپین رد شد.");
                      }}>رد نامه</button>
                      <button className="btn btn-primary" disabled={busy} onClick={() => act({ action: "approve" }, "کمپین تأیید شد. حالا می‌توانید ارسال کنید.")}>
                        تأیید نامه
                      </button>
                    </>
                  )}
                  {permissions.send && campaign.status === "APPROVED" && (
                    <button className="btn btn-primary" disabled={busy}
                            onClick={() => confirm(`پیامک برای ${recipients.length} مخاطب ارسال شود؟ این عملیات برگشت‌پذیر نیست.`) && act({ action: "send" }, "ارسال انجام شد.")}>
                      <Send className="h-4 w-4" />ارسال پیامک به {faNumber(recipients.length)} مخاطب
                    </button>
                  )}
                </div>
              )}

              {campaign.approvedBy && <p className="text-xs" style={{ color: "var(--muted)" }}>تأییدکننده: {campaign.approvedBy}</p>}
            </div>

            {(sent > 0 || failed > 0 || skipped > 0) && (
              <div className="card p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-bold">نتیجه ارسال</h2>
                  <div className="flex gap-2">
                    <Badge tone="success">{faNumber(sent)} موفق</Badge>
                    {failed > 0 && <Badge tone="danger">{faNumber(failed)} ناموفق</Badge>}
                    {skipped > 0 && <Badge tone="warn">{faNumber(skipped)} نادیده</Badge>}
                    {permissions.send && failed > 0 && (
                      <button className="btn btn-sm" disabled={busy} onClick={() => act({ action: "retryFailed" }, "تلاش مجدد انجام شد.")}>
                        تلاش مجدد برای ناموفق‌ها
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-[50dvh] overflow-auto">
                  <table className="table">
                    <caption className="sr-only">وضعیت ارسال به تفکیک مخاطب</caption>
                    <thead><tr><th>مخاطب</th><th>شماره</th><th>وضعیت</th><th>لینک نامه</th><th>کد دسترسی</th></tr></thead>
                    <tbody>
                      {recipients.map((r) => (
                        <tr key={r.id}>
                          <td>{r.name}</td>
                          <td className="tnum" dir="ltr">{r.mobilePhone || "—"}</td>
                          <td>
                            <Badge tone={RECIPIENT_STATUS[r.status].tone}>{RECIPIENT_STATUS[r.status].label}</Badge>
                            {r.errorMessage && <span className="block text-xs" style={{ color: "var(--danger)" }}>{r.errorMessage}</span>}
                          </td>
                          <td>
                            {r.shortCode ? (
                              <a className="inline-flex items-center gap-1 text-brand-600 hover:underline" href={`/l/${r.shortCode}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5" />مشاهده
                              </a>
                            ) : "—"}
                          </td>
                          <td className="tnum">{r.accessCode ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {override && (
        <OverrideDialog
          recipient={override}
          defaultBody={body}
          onClose={() => setOverride(null)}
          onSave={async (html) => { await act({ action: "overrideLetter", recipientId: override.id, bodyHtml: html }, "متن اختصاصی ذخیره شد."); setOverride(null); }}
        />
      )}
    </>
  );
}

function OverrideDialog({ recipient, defaultBody, onClose, onSave }: {
  recipient: Recipient; defaultBody: string; onClose: () => void; onSave: (html: string | null) => void;
}) {
  const [html, setHtml] = useState(recipient.overrideHtml ?? defaultBody);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-label={`متن اختصاصی برای ${recipient.name}`}>
      <div className="card max-h-[92dvh] w-full max-w-2xl space-y-4 overflow-y-auto p-5">
        <h2 className="text-lg font-bold">متن اختصاصی برای {recipient.name}</h2>
        <p className="hint">این متن فقط برای همین مخاطب استفاده می‌شود و متن اصلی کمپین را تغییر نمی‌دهد.</p>
        <textarea className="textarea h-64 font-mono text-xs" value={html} onChange={(e) => setHtml(e.target.value)} />
        <div className="flex justify-between gap-2">
          <button className="btn btn-danger" onClick={() => onSave(null)}>حذف متن اختصاصی</button>
          <span className="flex gap-2">
            <button className="btn" onClick={onClose}>انصراف</button>
            <button className="btn btn-primary" onClick={() => onSave(html)}>ذخیره</button>
          </span>
        </div>
      </div>
    </div>
  );
}
