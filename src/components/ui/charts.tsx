import { faNumber } from "@/lib/jalali";

/**
 * نمودارهای گزارش‌ها.
 *
 * SVG دستی و بدون کتابخانه: چند ده مستطیل، ارزش یک وابستگی تازه و چند صد
 * کیلوبایت جاوااسکریپت را ندارد. رنگ‌ها از همان متغیرهای پوسته می‌آیند، پس
 * حالت تیره خودبه‌خود درست درمی‌آید.
 *
 * نکته دسترس‌پذیری: هیچ‌جا معنی فقط با رنگ منتقل نمی‌شود — هر ستون برچسب و عدد
 * دارد. مهم است چون سبز «موفق» و قرمز «ناموفق» برای کوررنگی قرمز-سبز از هم
 * جدا نمی‌شوند.
 */

export type TimePoint = { label: string; value: number };

/** ستونی زمانی: حجم در طول زمان. یک سری است، پس راهنما (legend) لازم ندارد. */
export function TimeBars({ points, title, hint }: { points: TimePoint[]; title: string; hint?: string }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const total = points.reduce((sum, p) => sum + p.value, 0);

  return (
    <figure className="card p-5">
      <figcaption className="mb-1 font-bold">{title}</figcaption>
      {hint && <p className="mb-3 text-xs" style={{ color: "var(--muted)" }}>{hint}</p>}

      {total === 0 ? (
        <p className="py-6 text-center text-sm" style={{ color: "var(--muted)" }}>در این بازه پیامکی ثبت نشده است.</p>
      ) : (
        <div className="flex h-44 items-end gap-[2px]" role="img"
             aria-label={`${title}: مجموع ${faNumber(total)} پیامک در ${faNumber(points.length)} روز`}>
          {points.map((point) => (
            <div key={point.label} className="group flex h-full min-w-0 flex-1 flex-col justify-end" title={`${point.label}: ${faNumber(point.value)}`}>
              <div
                className="w-full rounded-t"
                style={{
                  height: `${Math.max(point.value === 0 ? 0 : 3, (point.value / max) * 100)}%`,
                  background: "var(--primary)",
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex justify-between text-[11px]" style={{ color: "var(--muted)" }}>
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </figure>
  );
}

export type RankedRow = { label: string; value: number; color?: string; note?: string };

/** میله‌های افقی برچسب‌دار: مقایسه چند دسته با اندازه. */
export function RankedBars({ rows, title, hint, unit }: { rows: RankedRow[]; title: string; hint?: string; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <figure className="card p-5">
      <figcaption className="mb-1 font-bold">{title}</figcaption>
      {hint && <p className="mb-3 text-xs" style={{ color: "var(--muted)" }}>{hint}</p>}

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm" style={{ color: "var(--muted)" }}>داده‌ای برای نمایش نیست.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row) => (
            <li key={row.label}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                <span className="min-w-0 truncate font-semibold">{row.label}</span>
                <span className="tnum shrink-0" style={{ color: "var(--muted)" }}>
                  {faNumber(row.value)}{unit ? ` ${unit}` : ""}{row.note ? ` — ${row.note}` : ""}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(row.value === 0 ? 0 : 2, (row.value / max) * 100)}%`, background: row.color ?? "var(--primary)" }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
