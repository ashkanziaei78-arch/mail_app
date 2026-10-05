# -*- coding: utf-8 -*-
"""موسیقی فیلم «میلینگ پرس» — ساختهٔ کد، بدون نمونهٔ دارای حق نشر.
یک بستر آرام با پیشروی آکوردی که با ساختار فیلم بالا و پایین می‌رود."""
import math, struct, wave, random

SR = 48000
DUR = 170.0
N = int(SR * DUR)
L = [0.0] * N
R = [0.0] * N
random.seed(7)

NOTE = {"A2":110.0,"C3":130.81,"D3":146.83,"E3":164.81,"F3":174.61,"G3":196.0,"A3":220.0,
        "C4":261.63,"D4":293.66,"E4":329.63,"F4":349.23,"G4":392.0,"A4":440.0,
        "C5":523.25,"E5":659.26,"G5":783.99,"A5":880.0}

def env(i, n, atk, rel):
    """پاکت نرم: ورود و خروج آرام تا هیچ نتی «کلیک» ندهد."""
    a, r = int(atk * SR), int(rel * SR)
    if i < a: return (i / a) ** 2
    if i > n - r: return max(0.0, (n - i) / r) ** 2
    return 1.0

def pad(freqs, t0, dur, gain, pan=0.0, detune=0.6):
    n = int(dur * SR); s = int(t0 * SR)
    if s < 0: return
    parts = []
    for f in freqs:
        for k, amp in ((1, 1.0), (2, 0.30), (3, 0.10), (4, 0.05)):
            parts.append((f * k, amp, random.random() * 6.283))
            parts.append((f * k * (1 + detune / 1000.0), amp * 0.7, random.random() * 6.283))
    g = gain / max(1, len(freqs))
    for i in range(n):
        if s + i >= N: break
        e = env(i, n, dur * 0.34, dur * 0.42)
        # لرزش بسیار آرام تا صدا مُرده نباشد
        vib = 1.0 + 0.0018 * math.sin(2 * math.pi * 0.17 * (i / SR))
        v = 0.0
        ph = 2 * math.pi * (i / SR) * vib
        for f, amp, p0 in parts:
            v += amp * math.sin(ph * f + p0)
        v *= e * g
        L[s + i] += v * (1 - max(0.0, pan))
        R[s + i] += v * (1 + min(0.0, pan))

def pluck(freq, t0, gain, dur=2.6):
    """نتِ کوتاهِ زنگ‌مانند برای لحظه‌های تأکید."""
    n = int(dur * SR); s = int(t0 * SR)
    for i in range(n):
        if s + i >= N or s + i < 0: break
        tt = i / SR
        e = math.exp(-tt * 2.1) * (1 - math.exp(-tt * 260))
        v = (math.sin(2 * math.pi * freq * tt)
             + 0.34 * math.sin(2 * math.pi * freq * 2 * tt)
             + 0.12 * math.sin(2 * math.pi * freq * 3.01 * tt)) * e * gain
        L[s + i] += v; R[s + i] += v

def whoosh(t0, dur, gain, up=True):
    """گذرِ نرم بین صحنه‌ها: نویز با فیلتر پایین‌گذرِ متحرک، بدون غرش."""
    n = int(dur * SR); s = int(t0 * SR)
    y = 0.0
    for i in range(n):
        if s + i >= N or s + i < 0: break
        p = i / n
        e = math.sin(math.pi * p) ** 1.6
        cut = (240 + 820 * (p if up else 1 - p)) / SR
        a = min(0.9, 2 * math.pi * cut)
        y += a * (random.uniform(-1, 1) - y)
        v = y * e * gain
        L[s + i] += v * 0.9; R[s + i] += v * 1.1

def drone(freq, t0, t1, gain):
    s, e_ = int(t0 * SR), int(t1 * SR); n = e_ - s
    for i in range(n):
        if s + i >= N: break
        tt = i / SR
        e = env(i, n, 3.0, 3.0)
        v = (math.sin(2 * math.pi * freq * tt)
             + 0.22 * math.sin(2 * math.pi * freq * 2 * tt)) * e * gain
        L[s + i] += v; R[s + i] += v

C = {  # آکوردها
 "Am": ["A3", "C4", "E4"], "F": ["F3", "A3", "C4"], "Dm": ["D3", "F3", "A3"],
 "E":  ["E3", "G3", "A3"], "Cmaj": ["C4", "E4", "G4"], "G": ["G3", "D4", "G4"],
 "Fhi": ["F3", "A3", "C4"], "Amhi": ["A3", "C4", "E4"],
}
def ch(name): return [NOTE[x] for x in C[name]]

# ---- پرده اول: کم‌رنگ، مینور، بدون حرکت ----
drone(NOTE["A2"], 0.5, 55.0, 0.085)
for i, (nm, t0) in enumerate([("Am", 1.0), ("F", 12.0), ("Dm", 23.0), ("Am", 34.0), ("E", 45.0)]):
    pad(ch(nm), t0, 12.0, 0.075 + i * 0.006)
pluck(NOTE["A4"], 1.2, 0.07)
for t in (5.3, 16.5, 26.6, 36.6, 46.4):
    whoosh(t - 0.5, 1.3, 0.020, up=False)

# ---- سکوت ۵۵ تا ۵۶٫۵ ----

# ---- پرده دوم: بالا آمدن ----
whoosh(56.2, 1.8, 0.030, up=True)
pad(ch("Cmaj"), 56.8, 7.0, 0.115)
pad(ch("G"), 61.5, 6.5, 0.105)
pluck(NOTE["C5"], 60.1, 0.085); pluck(NOTE["G5"], 60.45, 0.055)
drone(NOTE["C3"], 56.8, 66.5, 0.07)

# ---- پرده سوم: پیشروی یکنواخت و آرام ----
prog = ["Cmaj", "G", "Amhi", "Fhi"]
t = 66.0
k = 0
while t < 141.0:
    pad(ch(prog[k % 4]), t, 10.4, 0.082)
    k += 1; t += 9.4
drone(NOTE["C3"], 66.0, 141.5, 0.055)
for tt in (79.6, 91.6, 105.6, 117.6, 131.6):
    whoosh(tt - 0.55, 1.2, 0.015, up=True)
pluck(NOTE["E5"], 127.0, 0.05, 1.8)        # لحظه «تأیید»
pluck(NOTE["A5"], 129.8, 0.045, 2.0)       # «۳ دقیقه»

# ---- پرده چهارم و پنجم: جمع‌بندی ----
pad(ch("Fhi"), 141.0, 9.0, 0.09)
pad(ch("Cmaj"), 149.0, 9.0, 0.095)
pad(ch("G"), 156.0, 8.0, 0.095)
pad(ch("Cmaj"), 162.0, 9.0, 0.10)
drone(NOTE["C3"], 141.0, 169.5, 0.06)
pluck(NOTE["C5"], 156.3, 0.07); pluck(NOTE["G5"], 156.65, 0.045)

# ---- بازتاب ساده (سه انعکاس کوتاه) و محوشدن پایانی ----
def reverb(buf, taps=((0.031, 0.26), (0.057, 0.18), (0.093, 0.12), (0.151, 0.07))):
    out = buf[:]
    for d, g in taps:
        dn = int(d * SR)
        for i in range(dn, N):
            out[i] += buf[i - dn] * g
    return out
L = reverb(L); R = reverb(R)

fade_in = int(1.2 * SR); fade_out_start = int(166.5 * SR)
for i in range(fade_in):
    L[i] *= i / fade_in; R[i] *= i / fade_in
for i in range(fade_out_start, N):
    g = max(0.0, (N - i) / (N - fade_out_start)) ** 1.4
    L[i] *= g; R[i] *= g
# سکوت کامل بین پرده اول و معرفی
for i in range(int(55.0 * SR), int(56.2 * SR)):
    g = max(0.0, 1 - (i - 55.0 * SR) / (0.5 * SR))
    L[i] *= g; R[i] *= g

peak = max(max(abs(x) for x in L), max(abs(x) for x in R)) or 1.0
norm = 0.72 / peak
with wave.open("score.wav", "w") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    frames = bytearray()
    for i in range(N):
        a = int(max(-1, min(1, L[i] * norm)) * 32000)
        b = int(max(-1, min(1, R[i] * norm)) * 32000)
        frames += struct.pack("<hh", a, b)
    w.writeframes(bytes(frames))
print("score.wav written", DUR, "s  peak", round(peak, 3))
