"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Plus, Trash2, Upload } from "lucide-react";
import { Field, PageHeader } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

import { BANNER_DEFAULTS, type Banner, type BannerSettings } from "@/lib/banners";

/**
 * نشان سازمان، نشان تب مرورگر و بنرهای صفحه ورود.
 *
 * بنرها اسلایدی نمایش داده می‌شوند؛ هر بنر یک تصویر است و یک متن که زیرش
 * می‌نشیند. ترتیب همین فهرست، ترتیب نمایش است.
 */
export default function BrandingClient({ logoPath, faviconPath, banners: initial }: {
  logoPath: string | null;
  faviconPath: string | null;
  banners: BannerSettings;
}) {
  const router = useRouter();
  const toast = useToast();
  const [banners, setBanners] = useState<Banner[]>(initial.items);
  /** تیرگی روی تصویر و مدت نمایش هر بنر — همان‌ها که صفحه ورود می‌خواند */
  const [overlay, setOverlay] = useState(initial.overlay ?? BANNER_DEFAULTS.overlay);
  const [seconds, setSeconds] = useState(initial.seconds ?? BANNER_DEFAULTS.seconds);
  const [busy, setBusy] = useState(false);

  async function upload(file: File, kind: "logo" | "favicon" | "banner") {
    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    const res = await fetch("/api/settings/branding", { method: "POST", body: form });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { toast("error", json.error); return null; }
    toast("success", "تصویر آپلود شد.");
    if (kind !== "banner") router.refresh();
    return json.data.path as string;
  }

  async function save(extra?: { removeLogo?: boolean; removeFavicon?: boolean }) {
    setBusy(true);
    const res = await fetch("/api/settings/branding", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ banners, overlay, seconds, ...extra }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) { toast("error", json.error); return; }
    toast("success", "ذخیره شد.");
    router.refresh();
  }

  return (
    <>
      <PageHeader
        title="نشان و بنرها"
        description="نشان سازمان در منو، نشان کوچک تب مرورگر، و بنرهایی که در صفحه ورود اسلایدی نشان داده می‌شوند."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-3 p-5">
          <h2 className="font-bold">نشان سازمان (منو)</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            PNG یا JPG با پس‌زمینه شفاف بهترین نتیجه را می‌دهد. در بالای منوی راست دیده می‌شود.
          </p>
          {logoPath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoPath} alt="نشان فعلی سازمان" className="max-h-20 rounded-lg" style={{ background: "var(--surface-2)" }} />
          )}
          <div className="flex flex-wrap gap-2">
            <label className="btn btn-sm">
              <Upload className="h-4 w-4" aria-hidden="true" />آپلود نشان
              <input type="file" accept="image/png,image/jpeg,image/webp" hidden
                     onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, "logo"); }} />
            </label>
            {logoPath && <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => save({ removeLogo: true })}>حذف نشان</button>}
          </div>
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-bold">نشان تب مرورگر</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            همان تصویر کوچکی که کنار نام صفحه در مرورگر دیده می‌شود. مربع و ساده باشد بهتر است (۶۴ تا ۲۵۶ پیکسل).
          </p>
          {faviconPath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={faviconPath} alt="نشان فعلی تب مرورگر" className="h-12 w-12 rounded-lg" style={{ background: "var(--surface-2)" }} />
          )}
          <div className="flex flex-wrap gap-2">
            <label className="btn btn-sm">
              <Upload className="h-4 w-4" aria-hidden="true" />آپلود نشان تب
              <input type="file" accept="image/png,image/jpeg,image/webp" hidden
                     onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, "favicon"); }} />
            </label>
            {faviconPath && <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => save({ removeFavicon: true })}>حذف</button>}
          </div>
        </section>

        <section className="card space-y-4 p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-bold"><ImageIcon className="h-5 w-5" aria-hidden="true" />بنرهای صفحه ورود</h2>
            <label className="btn btn-sm">
              <Plus className="h-4 w-4" aria-hidden="true" />بنر تازه
              <input type="file" accept="image/png,image/jpeg,image/webp" hidden
                     onChange={async (e) => {
                       const f = e.target.files?.[0];
                       if (!f) return;
                       const path = await upload(f, "banner");
                       if (path) setBanners((list) => [...list, { src: path, caption: "" }]);
                       e.target.value = "";
                     }} />
            </label>
          </div>

          <p className="text-sm" style={{ color: "var(--muted)" }}>
            بنرها یکی‌یکی عوض می‌شوند و متن هر کدام زیرش نوشته می‌شود. کاربر هم می‌تواند با دکمه‌های کناری یا کشیدن تصویر، بنر را جلو و عقب ببرد.
            اگر بنری نگذارید، تصویر پیش‌فرض نشان داده می‌شود.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={`تیرگی روی تصویر: ${overlay}٪`}
              hint="هرچه کمتر، عکس واضح‌تر؛ هرچه بیشتر، متن روی عکس خواناتر. پیشنهاد: بین ۲۰ تا ۵۰."
            >
              <input
                type="range" min={0} max={100} step={5} value={overlay}
                onChange={(e) => setOverlay(Number(e.target.value))}
                className="w-full"
              />
            </Field>

            <Field label="مدت نمایش هر بنر (ثانیه)" hint="بین ۳ تا ۱۲۰ ثانیه.">
              <input
                type="number" min={3} max={120} className="input tnum" dir="ltr"
                value={seconds}
                onChange={(e) => setSeconds(Number(e.target.value))}
              />
            </Field>
          </div>

          {banners[0] && (
            <div className="overflow-hidden rounded-xl">
              <p className="mb-2 text-xs" style={{ color: "var(--muted)" }}>پیش‌نمایش با تیرگی فعلی:</p>
              <div
                className="grid h-40 place-items-center bg-cover bg-center p-4 text-center text-white"
                style={{
                  backgroundImage:
                    `linear-gradient(140deg, rgba(10,26,51,${(overlay / 100).toFixed(2)}), rgba(37,99,235,${(overlay / 160).toFixed(2)})), url(${banners[0].src})`,
                }}
              >
                <span className="text-lg font-bold">{banners[0].caption || "متن بنر"}</span>
              </div>
            </div>
          )}

          {banners.length === 0 ? (
            <p className="rounded-xl p-3 text-sm" style={{ background: "var(--surface-2)" }}>هنوز بنری اضافه نشده است.</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {banners.map((banner, index) => (
                <li key={`${banner.src}-${index}`} className="rounded-xl border p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={banner.src} alt="" className="mb-2 h-32 w-full rounded-lg object-cover" />
                  <Field label="متن زیر بنر">
                    <input
                      className="input"
                      value={banner.caption}
                      placeholder="یک نامه، هزار مخاطب — هرکدام با نام خودش."
                      onChange={(e) => setBanners((list) => list.map((b, i) => (i === index ? { ...b, caption: e.target.value } : b)))}
                    />
                  </Field>
                  <div className="mt-2 flex gap-2">
                    <button className="btn btn-sm" disabled={index === 0}
                            onClick={() => setBanners((l) => { const n = [...l]; [n[index - 1], n[index]] = [n[index], n[index - 1]]; return n; })}>
                      بالاتر
                    </button>
                    <button className="btn btn-sm" disabled={index === banners.length - 1}
                            onClick={() => setBanners((l) => { const n = [...l]; [n[index + 1], n[index]] = [n[index], n[index + 1]]; return n; })}>
                      پایین‌تر
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => setBanners((l) => l.filter((_, i) => i !== index))}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />حذف
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-end">
            <button className="btn btn-primary" disabled={busy} onClick={() => save()}>ذخیره بنرها</button>
          </div>
        </section>
      </div>
    </>
  );
}
