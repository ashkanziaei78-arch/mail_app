"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Copy, ExternalLink, Eye, MessageSquare, Send, Trash2 } from "lucide-react";
import Stepper from "@/components/ui/stepper";
import { Badge, Field, PageHeader } from "@/components/ui/primitives";
import Modal from "@/components/ui/modal";
import { useConfirm, useToast } from "@/components/ui/toast";
import { CAMPAIGN_STATUS, RECIPIENT_STATUS } from "@/lib/labels";
import { applyVariables, buildContext, LETTER_VARIABLES, SMS_VARIABLES } from "@/lib/render";
import { countSegments } from "@/lib/sms";
import { faDate, faDateTime, faNumber, faRelative } from "@/lib/jalali";
import DynamicField, { AREA_LABELS, type FieldDefinition } from "@/components/ui/dynamic-field";
import HashtagPicker, { type HashtagOption } from "@/components/ui/hashtag-picker";

type Recipient = {
  id: string; contactId: string; name: string; formalTitle: string; mobilePhone: string;
  jobTitle: string; contactOrganization: string; city: string;
  status: keyof typeof RECIPIENT_STATUS; errorMessage: string | null; overrideHtml: string | null;
  shortCode: string | null; accessCode: string | null; smsText: string | null; smsStatus: string | null;
  sentAt: string | null; deliveredAt: string | null;
  firstViewedAt: string | null; lastViewedAt: string | null; viewCount: number;
  respondedAt: string | null; responseKind: string | null; responseMessage: string | null;
};

type Approval = {
  id: string; order: number; status: string; positionId: string; positionName: string;
  approverName: string | null; note: string | null; decidedAt: string | null;
};

const RESPONSE_LABELS: Record<string, { label: string; tone: "success" | "danger" | "info" | "neutral" }> = {
  ACKNOWLEDGED: { label: "رسید", tone: "info" },
  ACCEPTED: { label: "پذیرفت", tone: "success" },
  DECLINED: { label: "نپذیرفت", tone: "danger" },
  REPLIED: { label: "پاسخ نوشت", tone: "info" },
};

const DEFAULT_SMS = "{{عنوان}} {{نام_کامل}} گرامی، با سلام و احترام، نامه‌ای از سوی {{سازمان_فرستنده}} برای شما صادر شده است.\nمشاهده نامه: {{لینک}}\nلغو: {{لغو_اشتراک}}";

export default function CampaignWizard({ organizationName, campaign, letter, recipients, options, permissions }: {
  organizationName: string;
  campaign: {
    id: string; name: string; subject: string | null; status: keyof typeof CAMPAIGN_STATUS;
    confidentiality: string; smsBodyText: string | null; rejectionReason: string | null;
    approvedBy: string | null; workflowName: string | null; approvals: Approval[];
  };
  letter: {
    title: string; letterNumber: string; subject: string; bodyHtml: string; senderName: string;
    letterheadId: string; letterheadUrl: string | null; fieldValues: Record<string, string>;
  };
  recipients: Recipient[];
  options: {
    contacts: Array<{ id: string; name: string; organizationName: string; mobilePhone: string }>;
    groups: Array<{ id: string; name: string; count: number }>;
    tags: Array<{ id: string; name: string; count: number }>;
    letterheads: Array<{ id: string; name: string; fileUrl: string; fields: FieldDefinition[] }>;
  };
  permissions: { write: boolean; approve: boolean; send: boolean; positionId: string | null; isOrgAdmin: boolean };
}) {
  const router = useRouter();
  const locked = ["PROCESSING", "COMPLETED", "CANCELLED"].includes(campaign.status);
  const toast = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [step, setStep] = useState(recipients.length === 0 ? 2 : locked ? 6 : 3);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  // انتخاب مخاطبین (مرحله ۲)
  const [contactIds, setContactIds] = useState<string[]>([]);
  const [tagMode, setTagMode] = useState<"AND" | "OR">("OR");
  const [search, setSearch] = useState("");
  const [hashtags, setHashtags] = useState<HashtagOption[]>([]);

  // متن نامه (مرحله ۴) و پیامک (مرحله ۶)
  const [body, setBody] = useState(letter.bodyHtml);
  const [letterheadId, setLetterheadId] = useState(letter.letterheadId);
  const [senderName, setSenderName] = useState(letter.senderName);
  const [smsText, setSmsText] = useState(campaign.smsBodyText ?? DEFAULT_SMS);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(letter.fieldValues ?? {});
  const [previewIndex, setPreviewIndex] = useState(0);
  const [override, setOverride] = useState<Recipient | null>(null);

  /** هشتگ‌های انتخاب‌شده به گروه و برچسب تفکیک می‌شوند. */
  function selectionPayload() {
    return {
      contactIds,
      groupIds: hashtags.filter((h) => h.kind === "group").map((h) => h.id),
      tagIds: hashtags.filter((h) => h.kind === "tag").map((h) => h.id),
      tagMode,
    };
  }

  const nothingSelected = hashtags.length === 0 && contactIds.length === 0;

  const filteredContacts = useMemo(() => {
    const q = search.trim();
    if (!q) return options.contacts.slice(0, 200);
    return options.contacts.filter((c) => c.name.includes(q) || c.organizationName.includes(q) || c.mobilePhone.includes(q)).slice(0, 200);
  }, [search, options.contacts]);

  async function act(payload: Record<string, unknown>, okText?: string) {
    setBusy(true);
    const res = await fetch(`/api/campaigns/${campaign.id}/actions`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { toast("error", json.error); return null; }
    if (okText) toast("success", okText);
    router.refresh();
    return json.data;
  }

  async function saveLetter() {
    setBusy(true);
    const res = await fetch(`/api/campaigns/${campaign.id}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        smsBodyText: smsText,
        letter: { bodyHtml: body, senderName, letterheadId: letterheadId || null, fieldValues },
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { toast("error", json.error); return false; }
    router.refresh();
    return true;
  }

  const activeFields = options.letterheads.find((l) => l.id === letterheadId)?.fields ?? [];

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

  // مقدار فیلدهای سربرگ هم در پیش‌نمایش جایگذاری می‌شود
  const previewContextWithFields: Record<string, string> = { ...previewContext };
  for (const field of activeFields) {
    const raw = fieldValues[field.key] ?? field.defaultValue ?? "";
    previewContextWithFields[`{{فیلد:${field.key}}}`] = field.type === "DATE" && raw ? faDate(raw) : raw;
  }

  const smsPreview = applyVariables(smsText, previewContextWithFields);
  const segments = countSegments(smsPreview);
  const activeLetterhead = options.letterheads.find((l) => l.id === letterheadId)?.fileUrl ?? letter.letterheadUrl;

  const sent = recipients.filter((r) => r.status === "SMS_SENT" || r.status === "SMS_DELIVERED").length;
  const failed = recipients.filter((r) => r.status === "SMS_FAILED").length;
  const skipped = recipients.filter((r) => r.status === "SKIPPED").length;
  const viewed = recipients.filter((r) => r.firstViewedAt).length;
  const responded = recipients.filter((r) => r.respondedAt).length;

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

      <Stepper current={step} onSelect={setStep} />

      <div className="mt-4" aria-busy={busy}>
        {/* ---------- مرحله ۲: انتخاب مخاطبین ---------- */}
        {step === 2 && (
          <section className="card space-y-5 p-5">
            <h2 className="font-bold">انتخاب مخاطبین</h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              می‌توانید هم‌زمان افراد مشخص، گروه‌ها و برچسب‌ها را انتخاب کنید؛ نتیجه بدون تکرار ادغام می‌شود.
            </p>

            <HashtagPicker
              options={[
                ...options.groups.map((g) => ({ id: g.id, name: g.name, count: g.count, kind: "group" as const })),
                ...options.tags.map((t) => ({ id: t.id, name: t.name, count: t.count, kind: "tag" as const })),
              ]}
              selected={hashtags}
              onChange={setHashtags}
              label="انتخاب گروهی با هشتگ"
            />

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <label htmlFor="contact-search" className="label">افزودن افراد مشخص</label>
                <input
                  id="contact-search" className="input mb-2" placeholder="جست‌وجوی نام، سازمان یا شماره"
                  value={search} onChange={(e) => setSearch(e.target.value)}
                />
                <label htmlFor="contact-list" className="sr-only">فهرست مخاطبین برای انتخاب</label>
                <select
                  id="contact-list" multiple className="select h-56" value={contactIds}
                  onChange={(e) => setContactIds([...e.target.selectedOptions].map((o) => o.value))}
                >
                  {filteredContacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.organizationName ? ` — ${c.organizationName}` : ""}</option>
                  ))}
                </select>
                <p className="hint">برای انتخاب چندتایی، Ctrl یا Cmd را نگه دارید.</p>
              </div>

              <Field
                label="شرط ترکیب برچسب‌ها"
                hint={tagMode === "AND"
                  ? "فقط کسانی که همه برچسب‌های انتخاب‌شده را دارند."
                  : "هرکس دست‌کم یکی از برچسب‌های انتخاب‌شده را داشته باشد."}
              >
                <select className="select" value={tagMode} onChange={(e) => setTagMode(e.target.value as "AND" | "OR")}>
                  <option value="OR">هر کدام از برچسب‌ها (OR)</option>
                  <option value="AND">همه برچسب‌ها همزمان (AND)</option>
                </select>
              </Field>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {nothingSelected && (
                <p className="me-auto text-sm" style={{ color: "var(--muted)" }}>
                  اول دست‌کم یک هشتگ یا مخاطب انتخاب کنید.
                </p>
              )}
              <button className="btn" disabled={busy || !permissions.write || nothingSelected}
                      onClick={async () => { await act({ action: "setRecipients", ...selectionPayload(), append: true }, "مخاطبین به فهرست اضافه شدند."); setStep(3); }}>
                افزودن به فهرست فعلی
              </button>
              <button className="btn btn-primary" disabled={busy || !permissions.write || nothingSelected}
                      onClick={async () => {
                        // جایگزینی، فهرست فعلی را دور می‌ریزد — پس وقتی چیزی در فهرست هست، تأیید می‌گیریم
                        if (recipients.length > 0) {
                          const ok = await confirm({
                            title: "جایگزینی فهرست مخاطبین",
                            body: `فهرست فعلی با ${faNumber(recipients.length)} مخاطب پاک می‌شود و فهرست تازه از انتخاب شما ساخته می‌گردد. برای نگه داشتن فهرست فعلی، «افزودن به فهرست فعلی» را بزنید.`,
                            confirmLabel: "جایگزین کن",
                            destructive: true,
                          });
                          if (!ok) return;
                        }
                        await act({ action: "setRecipients", ...selectionPayload(), append: false }, "فهرست مخاطبین ساخته شد.");
                        setStep(3);
                      }}>
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
              <div className="max-h-[60dvh] overflow-auto" tabIndex={0} role="region" aria-label="فهرست مخاطبین کمپین">
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

            {activeFields.length > 0 && (
              <fieldset className="rounded-xl border p-4">
                <legend className="label mb-0 px-2">فیلدهای سربرگ «{options.letterheads.find((l) => l.id === letterheadId)?.name}»</legend>
                <p className="hint mb-3">
                  این فیلدها را مدیر سازمان برای همین سربرگ تعریف کرده است.
                  هر کدام با <code dir="ltr">{"{{فیلد:کلید}}"}</code> در متن نامه قابل درج است.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {activeFields.map((field) => (
                    <div key={field.id} className={field.type === "RICH_TEXT" || field.type === "TEXTAREA" ? "sm:col-span-2" : ""}>
                      <DynamicField
                        field={field}
                        value={fieldValues[field.key] ?? field.defaultValue ?? ""}
                        onChange={(value) => setFieldValues((v) => ({ ...v, [field.key]: value }))}
                        disabled={locked}
                      />
                      <p className="hint" dir="ltr">{`{{فیلد:${field.key}}}`} — {AREA_LABELS[field.area]}</p>
                    </div>
                  ))}
                </div>
              </fieldset>
            )}

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
                {activeFields.map((field) => (
                  <button key={field.id} type="button" className="btn btn-sm" title={`فیلد سربرگ: ${field.label}`} disabled={locked}
                          style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
                          onClick={() => setBody((b) => b + `{{فیلد:${field.key}}}`)}>
                    {`{{فیلد:${field.key}}}`}
                  </button>
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
                  __html: applyVariables(previewRecipient?.overrideHtml ?? body, previewContextWithFields),
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
                      <button className="btn btn-danger" disabled={busy} onClick={() => setRejecting(true)}>رد نامه</button>
                      <button className="btn btn-primary" disabled={busy} onClick={() => act({ action: "approve" }, "کمپین تأیید شد. حالا می‌توانید ارسال کنید.")}>
                        تأیید نامه
                      </button>
                    </>
                  )}
                  {permissions.send && campaign.status === "APPROVED" && (
                    <button className="btn btn-primary" disabled={busy}
                            onClick={async () => {
                              const ok = await confirm({
                                title: "ارسال نهایی پیامک",
                                body: `پیامک برای ${faNumber(recipients.length)} مخاطب ارسال می‌شود. پیامک ارسال‌شده قابل بازگشت نیست و هزینه آن محاسبه می‌گردد.`,
                                confirmLabel: "ارسال کن",
                              });
                              if (ok) act({ action: "send" }, "ارسال انجام شد.");
                            }}>
                      <Send className="h-4 w-4" />ارسال پیامک به {faNumber(recipients.length)} مخاطب
                    </button>
                  )}
                </div>
              )}

              {campaign.approvedBy && <p className="text-xs" style={{ color: "var(--muted)" }}>تأییدکننده نهایی: {campaign.approvedBy}</p>}
            </div>

            {campaign.approvals.length > 0 && (
              <div className="card p-5">
                <h2 className="mb-1 font-bold">گردش تأیید{campaign.workflowName ? `: ${campaign.workflowName}` : ""}</h2>
                <p className="mb-3 text-sm" style={{ color: "var(--muted)" }}>
                  نامه به ترتیب از این سمت‌ها عبور می‌کند. رد شدن در هر مرحله، نامه را به پیش‌نویس برمی‌گرداند.
                </p>
                <ol className="space-y-2">
                  {campaign.approvals.map((approval) => {
                    const tone =
                      approval.status === "APPROVED" ? "success"
                      : approval.status === "REJECTED" ? "danger"
                      : approval.status === "SKIPPED" ? "neutral" : "warn";
                    const label =
                      approval.status === "APPROVED" ? "تأیید شد"
                      : approval.status === "REJECTED" ? "رد شد"
                      : approval.status === "SKIPPED" ? "انجام نشد" : "در انتظار";
                    const isCurrent = approval.status === "PENDING" && campaign.status === "PENDING_APPROVAL"
                      && approval.order === Math.min(...campaign.approvals.filter((a) => a.status === "PENDING").map((a) => a.order));
                    return (
                      <li key={approval.id} className="flex flex-wrap items-center gap-2 rounded-xl border p-3"
                          style={isCurrent ? { borderColor: "var(--primary)" } : undefined}>
                        <span className="tnum grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold"
                              style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
                          {faNumber(approval.order)}
                        </span>
                        <span className="font-semibold">{approval.positionName}</span>
                        <Badge tone={tone}>{label}</Badge>
                        {isCurrent && <Badge tone="info">مرحله جاری</Badge>}
                        {approval.approverName && (
                          <span className="text-xs" style={{ color: "var(--muted)" }}>
                            {approval.approverName} — {faDateTime(approval.decidedAt)}
                          </span>
                        )}
                        {approval.note && (
                          <span className="w-full text-xs" style={{ color: "var(--danger)" }}>یادداشت: {approval.note}</span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {(sent > 0 || failed > 0 || skipped > 0) && (
              <div className="card p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-bold">نتیجه ارسال</h2>
                  <div className="flex gap-2">
                    <Badge tone="success">{faNumber(sent)} موفق</Badge>
                    {failed > 0 && <Badge tone="danger">{faNumber(failed)} ناموفق</Badge>}
                    {skipped > 0 && <Badge tone="warn">{faNumber(skipped)} نادیده</Badge>}
                    {viewed > 0 && <Badge tone="info">{faNumber(viewed)} باز شده</Badge>}
                    {responded > 0 && <Badge tone="info">{faNumber(responded)} پاسخ</Badge>}
                    {permissions.send && failed > 0 && (
                      <button className="btn btn-sm" disabled={busy} onClick={() => act({ action: "retryFailed" }, "تلاش مجدد انجام شد.")}>
                        تلاش مجدد برای ناموفق‌ها
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-[50dvh] overflow-auto" tabIndex={0} role="region" aria-label="نتیجه ارسال">
                  <table className="table">
                    <caption className="sr-only">وضعیت ارسال به تفکیک مخاطب</caption>
                    <thead>
                      <tr>
                        <th>مخاطب</th><th>شماره</th><th>وضعیت</th>
                        <th>زمان ارسال</th><th>نخستین بازدید</th><th>پاسخ</th>
                        <th>لینک نامه</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipients.map((r) => (
                        <tr key={r.id}>
                          <td>{r.name}</td>
                          <td className="tnum" dir="ltr">{r.mobilePhone || "—"}</td>
                          <td>
                            <Badge tone={RECIPIENT_STATUS[r.status].tone}>{RECIPIENT_STATUS[r.status].label}</Badge>
                            {r.errorMessage && <span className="block text-xs" style={{ color: "var(--danger)" }}>{r.errorMessage}</span>}
                          </td>
                          <td className="tnum" title={r.sentAt ? faDateTime(r.sentAt) : undefined}>
                            {r.sentAt ? (
                              <span className="inline-flex items-center gap-1">
                                <Send className="h-3.5 w-3.5" style={{ color: "var(--muted)" }} />
                                {faRelative(r.sentAt)}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="tnum" title={r.firstViewedAt ? faDateTime(r.firstViewedAt) : undefined}>
                            {r.firstViewedAt ? (
                              <span className="inline-flex items-center gap-1">
                                <Eye className="h-3.5 w-3.5" style={{ color: "var(--success)" }} />
                                {faRelative(r.firstViewedAt)}
                                {r.viewCount > 1 && <span style={{ color: "var(--muted)" }}>({faNumber(r.viewCount)}×)</span>}
                              </span>
                            ) : (
                              <span style={{ color: "var(--muted)" }}>باز نشده</span>
                            )}
                          </td>
                          <td title={r.responseMessage ?? undefined}>
                            {r.responseKind ? (
                              <span className="flex flex-col gap-0.5">
                                <Badge tone={RESPONSE_LABELS[r.responseKind]?.tone ?? "neutral"}>
                                  {RESPONSE_LABELS[r.responseKind]?.label ?? r.responseKind}
                                </Badge>
                                <span className="tnum text-xs" style={{ color: "var(--muted)" }}>{faRelative(r.respondedAt)}</span>
                              </span>
                            ) : (
                              <span style={{ color: "var(--muted)" }}>—</span>
                            )}
                          </td>
                          <td>
                            {r.shortCode ? (
                              <a className="link inline-flex items-center gap-1" href={`/l/${r.shortCode}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5" />مشاهده
                                {r.accessCode && <span className="tnum" style={{ color: "var(--muted)" }}>({r.accessCode})</span>}
                              </a>
                            ) : "—"}
                          </td>
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

      {rejecting && (
        <RejectDialog
          onClose={() => setRejecting(false)}
          onSubmit={async (reason) => { setRejecting(false); await act({ action: "reject", reason }, "کمپین رد شد و به پیش‌نویس برگشت."); }}
        />
      )}
      {confirmDialog}

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
    <Modal
      title={`متن اختصاصی برای ${recipient.name}`}
      description="این متن فقط برای همین مخاطب استفاده می‌شود و متن اصلی کمپین را تغییر نمی‌دهد."
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-danger me-auto" onClick={() => onSave(null)}>حذف متن اختصاصی</button>
          <button className="btn" onClick={onClose}>انصراف</button>
          <button className="btn btn-primary" onClick={() => onSave(html)}>ذخیره</button>
        </>
      }
    >
      <label htmlFor="override-body" className="label">متن نامه این مخاطب</label>
      <textarea id="override-body" className="textarea h-64 font-mono text-xs" value={html} onChange={(e) => setHtml(e.target.value)} />
    </Modal>
  );
}

function RejectDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <Modal
      title="رد نامه"
      description="دلیل رد برای سازنده کمپین نمایش داده می‌شود تا بداند چه چیزی را اصلاح کند."
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>انصراف</button>
          <button className="btn btn-danger" disabled={reason.trim().length < 3} onClick={() => onSubmit(reason.trim())}>
            رد کن و برگردان
          </button>
        </>
      }
    >
      <Field label="دلیل رد" required hint="حداقل چند کلمه بنویسید.">
        <textarea className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
      </Field>
    </Modal>
  );
}
