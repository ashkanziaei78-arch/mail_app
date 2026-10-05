# -*- coding: utf-8 -*-
"""موسیقی نسخه عمودی «میلینگ پرس» — ساختهٔ کد، بدون نمونهٔ دارای حق نشر.
نسبت به نسخه افقی کاملاً عوض شده: ستون فقرات این‌بار یک آرپژِ کوتاه‌نُت است،
نه پدِ کشیده؛ تنالیته هم گرم‌تر است (ر مینور ← فا ماژور)."""
import wave
import numpy as np

SR = 48000; DUR = 150.0; N = int(SR * DUR)
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

# ---- قلاب (۰–۷٫۵): تقریباً سکوت، فقط یک ضربان ----
drone(NOTE["D2"], 0.4, 7.6, 0.075)
for t in np.arange(1.0, 7.4, 1.6): pulse(t, 0.14)
pluck(NOTE["D4"], 1.1, 0.10, 2.6)

# ---- مشکل‌ها (۷٫۵–۳۵): ر مینور، آرپژ کند، ضربان زیرِ کار ----
drone(NOTE["D2"], 7.5, 35.0, 0.08)
for i, (nm, t0) in enumerate([("Dm", 7.6), ("Bb", 13.1), ("Gm", 18.6), ("Dm", 24.1), ("A", 29.6)]):
    swell([NOTE[x] for x in CH[nm]][:3], t0, 5.8, 0.055 + i * 0.004)
    arp(nm, t0 + 0.1, 5.3, 0.66, 0.050 + i * 0.004)
for t in np.arange(7.8, 34.8, 1.6): pulse(t, 0.13)

# ---- سکوت ۳۵–۳۶٫۲ ----

# ---- معرفی (۳۶٫۲–۴۸): فا ماژور، گرم ----
swell([NOTE[x] for x in CH["F"]], 36.4, 7.2, 0.105)
swell([NOTE[x] for x in CH["C"]][:3], 42.4, 6.4, 0.095)
drone(NOTE["F2"], 36.4, 48.4, 0.07)
pluck(NOTE["F5"], 40.3, 0.085, 3.0); pluck(NOTE["C5"], 40.7, 0.055, 2.6)
arp("F", 43.0, 5.0, 0.52, 0.045)

# ---- تخته قابلیت‌ها (۴۸–۶۴): آرپژ + بافت ریتمیک، یک نت زیر هر کارت ----
drone(NOTE["F2"], 48.0, 64.4, 0.06)
for nm, t0 in [("F", 48.2), ("C", 52.2), ("Dm7", 56.2), ("Bb", 60.2)]:
    swell([NOTE[x] for x in CH[nm]][:3], t0, 4.4, 0.065)
    arp(nm, t0, 4.0, 0.5, 0.044)
for t in np.arange(48.4, 64.0, 0.5): shaker(t, 0.030)
CARD = ["F4", "A4", "C5", "D5", "C5", "A4", "F4", "A4", "C5"]
for i in range(9): pluck(NOTE[CARD[i]], 49.4 + i * 1.26, 0.052, 1.6)

# ---- نُه بند (۶۴–۱۳۶): پیشروی یکنواخت، حرکت رو به جلو ----
prog = ["F", "C", "Dm7", "Bb"]
drone(NOTE["F2"], 64.0, 136.4, 0.055)
t = 64.0; k = 0
while t < 136.0:
    nm = prog[k % 4]
    swell([NOTE[x] for x in CH[nm]][:3], t, 4.6, 0.062)
    arp(nm, t, 4.2, 0.52, 0.042)
    k += 1; t += 4.0
for t in np.arange(64.2, 135.6, 0.5): shaker(t, 0.026)
for t in [64.0, 72.0, 80.0, 88.0, 96.0, 104.0, 112.0, 120.0, 128.0]:
    pluck(NOTE["D5"], t, 0.045, 1.8)
pluck(NOTE["A5"], 100.1, 0.045, 1.6)      # لحظه «تأیید»

# ---- دعوت (۱۳۶–۱۵۰): جمع‌بندی ----
swell([NOTE[x] for x in CH["Bb"]], 136.0, 6.2, 0.085)
swell([NOTE[x] for x in CH["F"]], 141.5, 8.5, 0.10)
drone(NOTE["F2"], 136.0, 149.5, 0.065)
pluck(NOTE["F5"], 136.6, 0.075, 3.2); pluck(NOTE["C5"], 137.0, 0.05, 2.8)
arp("F", 142.0, 4.5, 0.6, 0.038)

# ---- بازتاب، محو، سکوتِ میانی ----
def reverb(b):
    out = b.copy()
    for d, g in ((0.037, 0.24), (0.068, 0.17), (0.111, 0.11), (0.173, 0.06)):
        dn = int(d * SR); out[dn:] += b[:-dn] * g
    return out
L = reverb(L); R = reverb(R)
fi = int(1.0 * SR); L[:fi] *= np.linspace(0, 1, fi); R[:fi] *= np.linspace(0, 1, fi)
fo = int(146.5 * SR); g = np.linspace(1, 0, N - fo) ** 1.4; L[fo:] *= g; R[fo:] *= g
a, b = int(34.9 * SR), int(36.1 * SR)
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
