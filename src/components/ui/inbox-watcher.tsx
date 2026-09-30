"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { faNumber } from "@/lib/jalali";

/**
 * دیده‌بان کارتابل: هر نیم‌دقیقه تعداد نامه‌های منتظر تصمیم کاربر را می‌پرسد و
 * اگر زیاد شده بود، هشدار می‌دهد — نشان روی زنگ، یک بوق کوتاه، و اعلان سیستمی
 * اگر کاربر اجازه‌اش را داده باشد.
 *
 * صدا با WebAudio ساخته می‌شود نه فایل صوتی: نه دانلودی دارد و نه به مسیر
 * استاتیک وابسته است. مرورگرها تا وقتی کاربر با صفحه کار نکرده باشد اجازه پخش
 * نمی‌دهند؛ برای همین خطای پخش بی‌سروصدا رد می‌شود.
 */
function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    osc.onended = () => ctx.close();
  } catch {
    // صدا نعمت است نه ضرورت؛ نبودش نباید چیزی را بشکند
  }
}

export default function InboxWatcher() {
  const [pending, setPending] = useState(0);
  const previous = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;

    async function check() {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        const json = await res.json();
        if (!alive || !json.ok) return;
        const count: number = json.data.pending;
        setPending(count);

        // بار اول فقط مقدار اولیه را می‌گیریم؛ نامه‌های از قبل مانده هشدار ندارند
        if (previous.current !== null && count > previous.current) {
          beep();
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("نامه تازه در کارتابل", { body: `${count - previous.current} نامه منتظر تأیید شماست.` });
          }
        }
        previous.current = count;
      } catch {
        // قطعی شبکه: دفعه بعد دوباره تلاش می‌شود
      }
    }

    check();
    const timer = setInterval(check, 30_000);
    // برگشتن به تب هم یک بررسی فوری بگیرد
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => { alive = false; clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, []);

  async function askPermission() {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") await Notification.requestPermission();
  }

  return (
    <Link
      href="/approvals"
      onClick={askPermission}
      className="relative grid h-9 w-9 place-items-center rounded-xl"
      style={{ background: "var(--surface-2)" }}
      aria-label={pending > 0 ? `${pending} نامه منتظر تأیید` : "کارتابل تأیید"}
      title={pending > 0 ? "نامه منتظر تأیید دارید" : "کارتابل تأیید"}
    >
      <Bell className="h-4 w-4" aria-hidden="true" />
      {pending > 0 && (
        <span
          className="tnum absolute -top-1 -left-1 grid min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold"
          style={{ background: "var(--danger)", color: "#fff" }}
        >
          {faNumber(pending)}
        </span>
      )}
    </Link>
  );
}
