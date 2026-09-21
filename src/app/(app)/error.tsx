"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

/** مرز خطا — به‌جای صفحه سفید، پیام روشن و راه بازگشت. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card mx-auto max-w-lg p-6 text-center" role="alert">
      <h1 className="mb-2 text-lg font-bold">این بخش بارگذاری نشد</h1>
      <p className="mb-4 text-sm" style={{ color: "var(--muted)" }}>
        خطایی در سمت سرور رخ داد. یک بار تلاش دوباره کنید؛ اگر باز هم تکرار شد،
        کد خطا را به پشتیبانی بدهید.
      </p>
      {error.digest && (
        <p className="tnum mb-4 select-all rounded-lg px-3 py-2 text-xs" style={{ background: "var(--surface-2)" }}>
          کد خطا: {error.digest}
        </p>
      )}
      <button className="btn btn-primary" onClick={reset}>
        <RotateCcw className="h-4 w-4" />
        تلاش دوباره
      </button>
    </div>
  );
}
