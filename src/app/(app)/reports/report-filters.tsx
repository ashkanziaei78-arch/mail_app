"use client";

import { useState } from "react";
import JalaliDateInput from "@/components/ui/jalali-date-input";
import { SMS_STATUS } from "@/lib/labels";

/**
 * فیلترهای گزارش با تقویم شمسی.
 *
 * فیلد date مرورگر فقط میلادی است، برای همین از تقویم شمسی خودمان استفاده
 * می‌کنیم و مقدار را در یک input مخفی به شکل ISO می‌گذاریم تا همان فرم ساده
 * GET کار کند.
 */
export default function ReportFilters({ from, to, status }: { from?: string; to?: string; status?: string }) {
  const [fromValue, setFromValue] = useState<string | null>(from ?? null);
  const [toValue, setToValue] = useState<string | null>(to ?? null);

  return (
    <form className="card mb-4 grid gap-3 p-3 md:grid-cols-4" method="get">
      <div>
        <label htmlFor="from" className="label">از تاریخ</label>
        <JalaliDateInput id="from" name="from" value={fromValue} onChange={setFromValue} />
      </div>
      <div>
        <label htmlFor="to" className="label">تا تاریخ</label>
        <JalaliDateInput id="to" name="to" value={toValue} onChange={setToValue} />
      </div>
      <div>
        <label htmlFor="status" className="label">وضعیت</label>
        <select id="status" name="status" className="select" defaultValue={status ?? ""}>
          <option value="">همه</option>
          {Object.entries(SMS_STATUS).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
        </select>
      </div>
      <div className="flex items-end"><button className="btn btn-primary w-full" type="submit">اعمال فیلتر</button></div>
    </form>
  );
}
