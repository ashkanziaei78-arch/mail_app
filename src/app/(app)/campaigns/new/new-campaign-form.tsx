"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, PageHeader } from "@/components/ui/primitives";
import Stepper from "@/components/ui/stepper";

export default function NewCampaignForm({ letterheads, templates }: {
  letterheads: Array<{ id: string; name: string; isDefault: boolean }>;
  templates: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        subject: form.get("subject") || null,
        confidentiality: form.get("confidentiality"),
        letterheadId: form.get("letterheadId") || null,
        letterTemplateId: form.get("letterTemplateId") || null,
        letterNumber: form.get("letterNumber") || null,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { setError(json.error); return; }
    router.push(`/campaigns/${json.data.id}`);
  }

  return (
    <>
      <PageHeader title="ساخت کمپین جدید" description="مرحله اول: مشخصات کلی نامه. مراحل بعد پس از ذخیره باز می‌شوند." />
      <Stepper current={1} />

      <form onSubmit={submit} className="card mt-4 grid gap-4 p-5 md:grid-cols-2">
        <Field label="نام کمپین" required hint="مثال: دعوت‌نامه همایش سالانه فناوری">
          <input className="input" name="name" required maxLength={120} />
        </Field>
        <Field label="موضوع نامه"><input className="input" name="subject" maxLength={200} placeholder="موضوع نامه" /></Field>

        <Field label="سربرگ" hint={letterheads.length ? undefined : "هنوز سربرگی ثبت نشده — از بخش «سربرگ و قالب نامه» اضافه کنید."}>
          <select className="select" name="letterheadId" defaultValue={letterheads.find((l) => l.isDefault)?.id ?? ""}>
            <option value="">بدون سربرگ</option>
            {letterheads.map((l) => <option key={l.id} value={l.id}>{l.name}{l.isDefault ? " (پیش‌فرض)" : ""}</option>)}
          </select>
        </Field>

        <Field label="قالب نامه" hint="متن قالب در مرحله «متن نامه» قابل ویرایش است.">
          <select className="select" name="letterTemplateId" defaultValue="">
            <option value="">بدون قالب — متن را خودم می‌نویسم</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>

        <Field label="شماره نامه"><input className="input tnum" name="letterNumber" maxLength={60} placeholder="۱۴۰۴/۱۲۳۴" /></Field>

        <Field label="سطح محرمانگی" hint="نامه محرمانه: لینک با کد دسترسی شش‌رقمی که در پیامکی جداگانه ارسال می‌شود.">
          <select className="select" name="confidentiality" defaultValue="NORMAL">
            <option value="NORMAL">معمولی</option>
            <option value="CONFIDENTIAL">محرمانه (کدگذاری‌شده)</option>
          </select>
        </Field>

        {error && <p role="alert" className="error-text md:col-span-2">{error}</p>}

        <div className="flex justify-between md:col-span-2">
          <Link href="/campaigns" className="btn">انصراف</Link>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "در حال ذخیره…" : "مرحله بعد"}</button>
        </div>
      </form>
    </>
  );
}
