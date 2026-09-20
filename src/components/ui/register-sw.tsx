"use client";

import { useEffect } from "react";

/** ثبت service worker — فقط برای نصب‌پذیری روی اندروید/کروم. */
export default function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => { /* نصب‌پذیری اختیاری است */ });
  }, []);
  return null;
}
