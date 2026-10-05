# -*- coding: utf-8 -*-
"""موسیقی نسخه عمودی «میلینگ پرس» — ساختهٔ کد، بدون نمونهٔ دارای حق نشر.
نسبت به نسخه افقی کاملاً عوض شده: ستون فقرات این‌بار یک آرپژِ کوتاه‌نُت است،
نه پدِ کشیده؛ تنالیته هم گرم‌تر است (ر مینور ← فا ماژور)."""
import wave
import numpy as np

SR = 48000; DUR = 132.0; N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(21)

NOTE = {"D2":73.42,"F2":87.31,"A2":110.0,"Bb2":116.54,"C3":130.81,"D3":146.83,"F3":174.61,
        "G3":196.0,"A3":220.0,"Bb3":233.08,"C4":261.63,"D4":293.66,"E4":329.63,"F4":349.23,
        "G4":392.0,"A4":440.0,"Bb4":466.16,"C5":523.25,"D5":587.33,"F5":698.46,"A5":880.0}

def seg(t0, dur):
    s = max(0, int(t0 * SR)); e = min(N, int((t0 + dur) * SR))
    return s, e, np.arange(max(0, e - s)) / SR

def pluck(freq, t0, gain, dur=1.9, warm=0.55):
    """نتِ کوتاهِ گرم — ستون فقرات این نسخه."""
    s, e, t = seg(t0, dur)
    if e <= s: return
    env = np.exp(-t * 3.1) * (1 - np.exp(-t * 150))
    v = (np.sin(2 * np.pi * freq * t)
         + warm * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-t * 6)
         + 0.18 * np.sin(2 * np.pi * freq * 3.01 * t) * np.exp(-t * 9)) * env * gain
    pan = 0.5 + 0.5 * np.sin(freq * 0.013)
    L[s:e] += v * (1.1 - 0.25 * pan); R[s:e] += v * (0.85 + 0.25 * pan)

def swell(freqs, t0, dur, gain):
    """آکورد کشیده و آرام، فقط به‌عنوان بستر."""
    s, e, t = seg(t0, dur)
    if e <= s: return
    env = np.clip(t / (dur * 0.38), 0, 1) ** 2 * np.clip((dur - t) / (dur * 0.45), 0, 1) ** 2
    v = np.zeros(e - s)
    for f in freqs:
        for k, a in ((1, 1.0), (2, 0.24), (3, 0.08)):
            v += a * np.sin(2 * np.pi * f * k * t + rng.random() * 6.283)
    v *= env * (gain / max(1, len(freqs)))
    L[s:e] += v; R[s:e] += v * 0.96

def pulse(t0, gain, freq=55.0, dur=1.1):
    """ضربانِ کمِ پایین — در پرده مشکل‌ها حس انتظار می‌دهد."""
    s, e, t = seg(t0, dur)
    if e <= s: return
    env = np.exp(-t * 3.4) * (1 - np.exp(-t * 60))
    v = np.sin(2 * np.pi * freq * t) * env * gain
    L[s:e] += v; R[s:e] += v

def shaker(t0, gain, dur=0.13):
    """بافتِ ریزِ ریتمیک برای پرده‌های پرحرکت."""
    s, e, t = seg(t0, dur)
    if e <= s: return
    n = e - s
    env = np.exp(-np.arange(n) / n * 5.5)
    y = rng.uniform(-1, 1, n)
    y = y - np.concatenate(([0], y[:-1])) * 0.82      # بالاگذرِ ساده
    v = y * env * gain
    L[s:e] += v * 1.1; R[s:e] += v * 0.9

def whoosh(t0, dur, gain, up=True):
    """گذرِ نرم بین صحنه‌ها — نویزِ فیلترشده، بدون غرش."""
    s_, e_, t = seg(t0, dur)
    if e_ <= s_: return
    n = e_ - s_; p = np.arange(n) / n
    env = np.sin(np.pi * p) ** 1.6
    noise = rng.uniform(-1, 1, n)
    cut = (240 + 820 * (p if up else 1 - p)) / SR
    a = np.minimum(0.9, 2 * np.pi * cut)
    y = np.zeros(n); acc = 0.0
    for i in range(n):
        acc += a[i] * (noise[i] - acc); y[i] = acc
    v = y * env * gain
    L[s_:e_] += v * 0.9; R[s_:e_] += v * 1.1

def drone(freq, t0, t1, gain):
    dur = t1 - t0; s, e, t = seg(t0, dur)
    if e <= s: return
    env = np.clip(t / 2.5, 0, 1) * np.clip((dur - t) / 2.5, 0, 1)
    v = (np.sin(2 * np.pi * freq * t) + 0.2 * np.sin(2 * np.pi * freq * 2 * t)) * env * gain
    L[s:e] += v; R[s:e] += v

CH = {
  "Dm":  ["D3", "F3", "A3", "D4"],
  "Bb":  ["Bb2", "D3", "F3", "Bb3"],
  "Gm":  ["G3", "Bb3", "D4", "G4"],
  "A":   ["A2", "C4", "E4", "A4"],
  "F":   ["F3", "A3", "C4", "F4"],
  "C":   ["C3", "E4", "G4", "C5"],
  "Dm7": ["D3", "F4", "A4", "D5"],
  "Bbm": ["Bb2", "D4", "F4", "Bb4"],
}
def arp(name, t0, dur, step, gain, order=(0, 1, 2, 3, 2, 1)):
    ns = [NOTE[x] for x in CH[name]]
    k = 0; t = t0
    while t < t0 + dur:
        pluck(ns[order[k % len(order)]], t, gain * (1.0 if k % len(order) == 0 else 0.8))
        k += 1; t += step

# ---- SCENE 01 قلاب (۰–۹): تقریباً سکوت، سه نتِ تنها ----
drone(NOTE["D2"], 0.4, 9.2, 0.075)
for t, n in ((1.1, "D4"), (4.0, "F4"), (6.7, "A4")):
    pluck(NOTE[n], t, 0.095, 2.8)
for t in (2.4, 5.3, 8.0): pulse(t, 0.12)

# ---- SCENE 02–06 مشکل‌ها (۹–۴۸): ر مینور، آرپژِ کند، ضربانِ زیرِ کار ----
drone(NOTE["D2"], 9.0, 48.0, 0.082)
for i, (nm, t0, dur) in enumerate([("Dm", 9.1, 8.0), ("Bb", 17.1, 8.0), ("Gm", 25.1, 9.0),
                                   ("Dm", 34.1, 7.0), ("A", 41.1, 7.0)]):
    swell([NOTE[x] for x in CH[nm]][:3], t0, dur - 0.2, 0.052 + i * 0.005)
    arp(nm, t0 + 0.1, dur - 0.6, 0.62, 0.046 + i * 0.005)
for t in np.arange(9.3, 47.6, 1.55): pulse(t, 0.125)
for t in (9.0, 17.0, 25.0, 34.0, 41.0): whoosh(t - 0.5, 1.2, 0.019, up=False)

# ---- SCENE 07 سؤال بزرگ (۴۸–۵۴) و سکوت تا ۵۵٫۵ ----
swell([NOTE[x] for x in CH["A"]][:3], 48.0, 5.4, 0.07)
pulse(48.2, 0.16); pulse(50.6, 0.14)
whoosh(52.4, 1.6, 0.026, up=False)

# ---- SCENE 08 معرفی (۵۵٫۵–۶۵): باز شدن به فا ماژور ----
whoosh(55.4, 1.9, 0.032, up=True)
swell([NOTE[x] for x in CH["F"]], 55.8, 6.4, 0.112)
swell([NOTE[x] for x in CH["C"]][:3], 61.0, 5.4, 0.096)
drone(NOTE["F2"], 55.8, 65.8, 0.072)
pluck(NOTE["F5"], 58.4, 0.08, 3.0)           # لحظهٔ جمع‌شدن ذرات
pluck(NOTE["C5"], 60.0, 0.085, 3.0); pluck(NOTE["A4"], 60.4, 0.05, 2.4)
arp("F", 62.0, 3.4, 0.5, 0.040)

# ---- SCENE 09–14 قابلیت‌ها (۶۵–۱۱۵): پیشروی یکنواخت و رو به جلو ----
prog = ["F", "C", "Dm7", "Bb"]
drone(NOTE["F2"], 65.0, 115.6, 0.056)
t = 65.0; k = 0
while t < 115.0:
    nm = prog[k % 4]
    swell([NOTE[x] for x in CH[nm]][:3], t, 4.4, 0.060)
    arp(nm, t, 4.0, 0.5, 0.042)
    k += 1; t += 4.0
for t in np.arange(65.2, 114.6, 0.5): shaker(t, 0.027)
for t in (65.0, 73.0, 81.0, 90.0, 98.0, 107.0):
    pluck(NOTE["D5"], t, 0.046, 1.8)
    whoosh(t - 0.5, 1.1, 0.013, up=True)
pluck(NOTE["A5"], 94.8, 0.045, 1.6)          # لحظهٔ «تأیید»

# ---- SCENE 15 دگرگونی (۱۱۵–۱۲۲): ساخت اوج ----
swell([NOTE[x] for x in CH["Bb"]], 115.2, 4.2, 0.082)
swell([NOTE[x] for x in CH["C"]][:3], 118.6, 4.0, 0.090)
drone(NOTE["F2"], 115.2, 122.4, 0.062)
for t in np.arange(115.4, 121.8, 0.5): shaker(t, 0.032)
pluck(NOTE["F5"], 118.3, 0.06, 2.2)

# ---- SCENE 16 دعوت (۱۲۲–۱۳۲) ----
swell([NOTE[x] for x in CH["F"]], 122.0, 10.0, 0.105)
drone(NOTE["F2"], 122.0, 131.5, 0.068)
for t, n in ((122.5, "F4"), (123.1, "A4"), (123.7, "C5")): pluck(NOTE[n], t, 0.05, 1.8)
pluck(NOTE["F5"], 125.5, 0.075, 3.2)         # «کنترلِ بیشتر»
pluck(NOTE["C5"], 128.2, 0.07, 3.4); pluck(NOTE["A5"], 128.6, 0.042, 2.8)
arp("F", 129.4, 2.4, 0.6, 0.034)

# ---- بازتاب، محو، سکوتِ میانی ----
def reverb(b):
    out = b.copy()
    for d, g in ((0.037, 0.24), (0.068, 0.17), (0.111, 0.11), (0.173, 0.06)):
        dn = int(d * SR); out[dn:] += b[:-dn] * g
    return out
L = reverb(L); R = reverb(R)
fi = int(1.0 * SR); L[:fi] *= np.linspace(0, 1, fi); R[:fi] *= np.linspace(0, 1, fi)
fo = int(129.5 * SR); g = np.linspace(1, 0, N - fo) ** 1.4; L[fo:] *= g; R[fo:] *= g
a, b = int(53.9 * SR), int(55.3 * SR)
gap = np.clip(np.linspace(1, -0.5, b - a), 0, 1); L[a:b] *= gap; R[a:b] *= gap

peak = max(np.abs(L).max(), np.abs(R).max()) or 1.0
sc = 0.72 / peak
out = np.empty((N, 2), dtype=np.int16)
out[:, 0] = np.clip(L * sc, -1, 1) * 32000
out[:, 1] = np.clip(R * sc, -1, 1) * 32000
with wave.open("score9.wav", "w") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(out.tobytes())
print("score9.wav ok, peak", round(float(peak), 3))
