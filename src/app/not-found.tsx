import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center p-6">
      <div className="card max-w-md p-6 text-center">
        <p className="tnum mb-2 text-4xl font-bold" style={{ color: "var(--muted)" }}>۴۰۴</p>
        <h1 className="mb-2 text-lg font-bold">این صفحه پیدا نشد</h1>
        <p className="mb-4 text-sm" style={{ color: "var(--muted)" }}>
          ممکن است نشانی اشتباه باشد، یا نامه‌ای که دنبالش هستید حذف شده باشد.
        </p>
        <Link href="/dashboard" className="btn btn-primary">بازگشت به داشبورد</Link>
      </div>
    </main>
  );
}
