// ponytail: کمینه‌ترین service worker برای نصب‌پذیری PWA (کروم به fetch handler نیاز دارد).
// کش آفلاین ندارد چون داده‌ها سازمانی و لحظه‌ای‌اند؛ فقط پیام قطعی شبکه نشان می‌دهد.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const OFFLINE = `<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>اتصال برقرار نیست</title>
<body style="font-family:Vazirmatn,Tahoma,sans-serif;display:grid;place-items:center;min-height:100dvh;margin:0;background:#f4f6fa;color:#0f172a">
<div style="text-align:center;padding:24px"><h1 style="font-size:18px">ارتباط با سامانه برقرار نشد</h1>
<p style="color:#4b5a70;font-size:14px">اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.</p></div>`;

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() => new Response(OFFLINE, { headers: { "content-type": "text/html; charset=utf-8" } })),
  );
});
