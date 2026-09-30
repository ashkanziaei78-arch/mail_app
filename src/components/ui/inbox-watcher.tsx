"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { faDateTime, faNumber } from "@/lib/jalali";

type Item = { id: string; name: string; subject: string | null; author: string; step: string | null; at: string };

/**
 * دیده‌بان کارتابل: هر نیم‌دقیقه نامه‌های منتظر تصمیم کاربر را می‌پرسد. زدن روی
 * زنگ فهرست کشویی باز می‌کند (نه رفتن مستقیم به تأیید)، تا کاربر اول ببیند چه
 * چیزی آمده و بعد خودش انتخاب کند.
 *
 * صدا با WebAudio ساخته می‌شود نه فایل صوتی: نه دانلودی دارد و نه به مسیر
 * استاتیک وابسته است. مرورگر تا وقتی کاربر با صفحه کار نکرده اجازه پخش نمی‌دهد،
 * پس خطای پخش بی‌سروصدا رد می‌شود.
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
  const [items, setItems] = useState<Item[]>([]);
  const [pending, setPending] = useState(0);
  const [open, setOpen] = useState(false);
  const previous = useRef<number | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;

    async function check() {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        const json = await res.json();
        if (!alive || !json.ok) return;
        setItems(json.data.items ?? []);
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
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => { alive = false; clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, []);

  // کلیک بیرون و کلید Esc، فهرست را می‌بندد
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  async function toggle() {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    setOpen((v) => !v);
  }

  return (
    <div className="relative" ref={box}>
      <button
        onClick={toggle}
        className="relative grid h-9 w-9 place-items-center rounded-xl"
        style={{ background: "var(--surface-2)" }}
        aria-label={pending > 0 ? `${pending} نامه منتظر تأیید` : "کارتابل تأیید"}
        aria-expanded={open}
        aria-haspopup="true"
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
      </button>

      {open && (
        <div
          className="card absolute left-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden p-0 shadow-lg"
          role="menu"
        >
          <p className="border-b px-3 py-2 text-xs font-bold">
            {pending > 0 ? `${faNumber(pending)} نامه منتظر تأیید شماست` : "چیزی در کارتابل نیست"}
          </p>

          {items.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/campaigns/${item.id}`}
                    onClick={() => setOpen(false)}
                    className="block border-b px-3 py-2.5 hover:opacity-80"
                    role="menuitem"
                  >
                    <span className="block truncate text-sm font-bold">{item.name}</span>
                    <span className="block truncate text-xs" style={{ color: "var(--muted)" }}>
                      {item.subject ?? "بدون موضوع"} — {item.author}
                      {item.step && <> — مرحله «{item.step}»</>}
                    </span>
                    <span className="tnum block text-[11px]" style={{ color: "var(--muted)" }}>{faDateTime(item.at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-4 text-xs" style={{ color: "var(--muted)" }}>
              هر نامه‌ای که برای تأیید شما فرستاده شود، همین‌جا با صدا خبر داده می‌شود.
            </p>
          )}

          <Link href="/approvals" onClick={() => setOpen(false)} className="block px-3 py-2 text-center text-xs font-bold" role="menuitem">
            رفتن به کارتابل تأیید
          </Link>
        </div>
      )}
    </div>
  );
}
