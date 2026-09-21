"use client";

/** آخرین سپر: خطایی که حتی چیدمان ریشه را از کار انداخته است. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fa" dir="rtl">
      <body style={{ fontFamily: "Vazirmatn, Tahoma, sans-serif", background: "#f4f6fa", color: "#0f172a", margin: 0 }}>
        <main style={{ display: "grid", placeItems: "center", minHeight: "100dvh", padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: "center", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
            <h1 style={{ fontSize: 18, marginBottom: 8 }}>سامانه با خطای غیرمنتظره متوقف شد</h1>
            <p style={{ fontSize: 14, color: "#4b5a70", marginBottom: 16 }}>
              صفحه را دوباره بارگذاری کنید. اگر تکرار شد، کد خطا را به پشتیبانی بدهید.
            </p>
            {error.digest && <p style={{ fontSize: 12, marginBottom: 16 }}>کد خطا: {error.digest}</p>}
            <button onClick={reset} style={{ background: "#1d4ed8", color: "#fff", border: 0, borderRadius: 8, padding: "10px 18px", fontSize: 14, cursor: "pointer" }}>
              تلاش دوباره
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
