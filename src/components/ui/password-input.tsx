"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** ورودی گذرواژه با دکمه نمایش/پنهان — جایگزین prompt() مرورگر. */
export default function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  // props (از جمله id و aria-describedby که Field می‌دهد) روی خود input می‌نشیند
  return (
    <span className="relative block">
      <input {...props} type={visible ? "text" : "password"} dir="ltr" className="input pl-11" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "پنهان کردن گذرواژه" : "نمایش گذرواژه"}
        aria-pressed={visible}
        className="absolute inset-y-0 left-1 my-auto grid h-9 w-9 place-items-center rounded-lg"
        style={{ color: "var(--muted)" }}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </span>
  );
}
