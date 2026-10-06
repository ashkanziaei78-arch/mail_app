"""
Score + SFX for the Mailing Press park film, synthesized in code.

    python3 music.py            # → assets/audio/score.wav (music + sfx, ducked under the VO plan)
                                #   beats.json (the grid every hit is snapped to)

Everything is a pure function of the seed and of the timings below: same input, same file.
Minimal cinematic piano (problem) → darker tension → brighter at the reveal →
subtle electronic + piano (features) → cinematic rise (CTA). The music stays under the voice:
the VO plan in vo/lines.json drives a ducking envelope.
"""
import json
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
DUR = 127.0
BPM = 80.0
BEAT = 60.0 / BPM
N = int(SR * DUR)
rng = np.random.default_rng(1404)

# scene starts on the film timeline (STORYBOARD.md)
SCENE = [0, 9.8, 15.8, 22.2, 29.6, 33.8, 41.0, 45.6, 55.0, 61.3, 66.8, 73.5, 86.0, 94.6, 100.2, 108.2]

def t2i(t): return int(round(t * SR))
def snap(t, div=2):                      # nearest half-beat
    g = BEAT / div
    return round(t / g) * g

def lp(x, f, order=2): return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), x)

def midi(n): return 440.0 * 2 ** ((n - 69) / 12)

L = np.zeros(N); R = np.zeros(N)
def add(sig, t, gain=1.0, pan=0.0):
    i = t2i(t)
    if i >= N: return
    sig = sig[: N - i]
    L[i:i + len(sig)] += sig * gain * np.sqrt(0.5 * (1 - pan))
    R[i:i + len(sig)] += sig * gain * np.sqrt(0.5 * (1 + pan))

# ---------- instruments ----------
def piano(note, dur=3.0, vel=0.6):
    n = int(SR * dur); t = np.arange(n) / SR; f = midi(note)
    s = np.zeros(n)
    for k, a in [(1, 1.0), (2, 0.45), (3, 0.22), (4, 0.12), (5, 0.06)]:
        s += a * np.sin(2 * np.pi * f * k * (1 + 0.0004 * k * k) * t) * np.exp(-t * (1.1 + 0.9 * k))
    s += 0.03 * lp(rng.standard_normal(n), 3000) * np.exp(-t * 60)      # hammer
    env = np.minimum(1, t / 0.004)
    return s * env * vel * 0.35

def pad(notes, dur, vel=0.3, bright=1200):
    n = int(SR * dur); t = np.arange(n) / SR; s = np.zeros(n)
    for nt in notes:
        for d in (-0.06, 0.0, 0.07):
            ph = rng.uniform(0, 2 * np.pi)
            s += np.sign(np.sin(2 * np.pi * midi(nt + d) * t + ph)) * 0.25 + np.sin(2 * np.pi * midi(nt + d) * t + ph)
    s = lp(s, bright, 4)
    a = min(1.2, dur / 3); r = min(2.0, dur / 2)
    env = np.minimum(1, t / a) * np.minimum(1, (dur - t) / r).clip(0)
    return s * env * vel / len(notes) * 0.25

def drone(note, dur, vel=0.3):
    n = int(SR * dur); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * midi(note) * t) + 0.4 * np.sin(2 * np.pi * midi(note + 12) * t + 1)
    s += 0.25 * lp(np.sign(np.sin(2 * np.pi * midi(note) * 1.003 * t)), 400)
    env = np.minimum(1, t / 2.5) * np.minimum(1, (dur - t) / 1.5).clip(0)
    return s * env * vel * 0.3

def kick(vel=0.5):
    n = int(SR * 0.35); t = np.arange(n) / SR
    f = 110 * np.exp(-t * 18) + 42
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * vel

def hat(vel=0.15):
    n = int(SR * 0.08); t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7000) * np.exp(-t * 60) * vel

def pluck(note, vel=0.2):
    n = int(SR * 0.6); t = np.arange(n) / SR
    s = np.sign(np.sin(2 * np.pi * midi(note) * t)) * 0.5 + np.sin(2 * np.pi * midi(note) * t)
    return lp(s, 2200) * np.exp(-t * 7) * vel

# ---------- sfx ----------
def whoosh(dur=0.5, vel=0.25, up=True):
    n = int(SR * dur); t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    out = np.zeros(n); seg = 256
    for i in range(0, n, seg):
        k = i / n; fc = 300 + (4000 if up else 1500) * (k if up else 1 - k)
        out[i:i + seg] = bp(noise[max(0, i - 2048):i + seg], fc, fc * 1.8)[-len(out[i:i + seg]):]
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return out * env * vel

def thump(vel=0.9):                       # the stamp press
    n = int(SR * 0.9); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(70 * np.exp(-t * 10) + 38) / SR) * np.exp(-t * 6)
    click = lp(rng.standard_normal(n), 2500) * np.exp(-t * 80) * 0.6
    return (body + click) * vel

def tick(vel=0.25):
    n = int(SR * 0.05); t = np.arange(n) / SR
    return bp(rng.standard_normal(n), 2500, 5000) * np.exp(-t * 120) * vel

def pop(note=84, vel=0.25):
    n = int(SR * 0.25); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * midi(note) * t) + 0.3 * np.sin(2 * np.pi * midi(note + 12) * t)) * np.exp(-t * 22) * vel

def buzz(dur=0.5, vel=0.18):              # phone vibration
    n = int(SR * dur); t = np.arange(n) / SR
    return lp(np.sign(np.sin(2 * np.pi * 150 * t)), 600) * (0.6 + 0.4 * np.sin(2 * np.pi * 22 * t)) * vel

def riser(dur, vel=0.35):
    n = int(SR * dur); t = np.arange(n) / SR
    noise = rng.standard_normal(n); out = np.zeros(n); seg = 512
    for i in range(0, n, seg):
        fc = 200 + 5000 * (i / n) ** 2
        out[i:i + seg] = bp(noise[max(0, i - 4096):i + seg], fc, fc * 1.6)[-len(out[i:i + seg]):]
    tone = np.sin(2 * np.pi * np.cumsum(110 + 330 * (t / dur) ** 2) / SR) * 0.3
    return (out + tone) * (t / dur) ** 2 * vel

def shimmer(dur=1.6, vel=0.12):
    n = int(SR * dur); t = np.arange(n) / SR; s = np.zeros(n)
    for k, nt in enumerate([84, 88, 91, 96, 100, 103]):
        st = int(k * n / 8); tt = t[: n - st]
        s[st:] += np.sin(2 * np.pi * midi(nt) * tt) * np.exp(-tt * 3)
    return s * vel

# ---------- the score ----------
Am, F, C, G, Em, Dm = [57, 60, 64], [53, 57, 60], [48, 55, 64], [55, 59, 62], [52, 55, 59], [50, 53, 57]
bars = lambda t0, t1: np.arange(t0, t1, BEAT * 4)

# 1 — problem: sparse piano, A minor (0 → 41)
prog = [Am, F, C, G]
for i, b in enumerate(bars(0.0, 41.0)):
    ch = prog[i % 4]
    add(piano(ch[0] - 12, 4.0, 0.55), b, pan=-0.1)
    add(piano(ch[2], 3.0, 0.32), b + BEAT * 2, pan=0.15)
    if i % 2 == 1: add(piano(ch[1] + 12, 2.5, 0.22), b + BEAT * 3, pan=0.25)
# tension under channels / paper / tracking: a low drone and a clock-like pulse
add(drone(33, 25.0, 0.35), 15.8)
for b in np.arange(snap(22.2), 41.0, BEAT): add(kick(0.12), b)
add(pad([45, 48, 51], 7.2, 0.25, 600), 33.8)                       # dim cluster for «پیگیری»
# 2 — the big question: hold a single low note, then a riser into the reveal
add(piano(33, 5.0, 0.6), snap(41.3))
add(riser(4.4, 0.32), 41.2)

# 3 — reveal: bright C major opens, mark presses on «اینجاست»
add(pad([48, 55, 60, 64, 67], 9.4, 0.5, 2400), 45.6)
for k, nt in enumerate([72, 76, 79, 84, 79, 76, 72, 76]):
    add(piano(nt, 2.0, 0.28), snap(46.2) + k * BEAT / 2, pan=(-0.3 + 0.08 * k))
add(piano(36, 5.0, 0.8), snap(51.92))
add(piano(60, 4.0, 0.4), snap(51.92)); add(piano(64, 4.0, 0.35), snap(51.92)); add(piano(67, 4.0, 0.3), snap(51.92))

# 4 — features: subtle electronic + piano (55 → 100.2)
fprog = [C, Am, F, G]
for i, b in enumerate(bars(snap(55.0), 100.2)):
    ch = fprog[i % 4]
    add(piano(ch[0], 3.2, 0.32), b, pan=-0.15)
    add(pad([n for n in ch], BEAT * 4 + 0.6, 0.22, 1400), b)
    for q in range(4):
        add(kick(0.30 if q in (0, 2) else 0.0), b + q * BEAT)
        add(hat(0.06), b + q * BEAT + BEAT / 2, pan=0.3)
        add(pluck(ch[q % 3] + 24, 0.08), b + q * BEAT + (BEAT / 2 if q % 2 else 0), pan=0.35 * (1 if q % 2 else -1))

# 5 — transformation: lift (100.2 → 108.2)
add(pad([48, 55, 60, 64, 71], 8.0, 0.45, 2000), 100.2)
for i, b in enumerate(bars(snap(100.2), 108.2)):
    for q in range(4): add(kick(0.32), b + q * BEAT); add(hat(0.08), b + q * BEAT + BEAT / 2)
    add(piano([60, 64, 67, 72][i % 4], 3.0, 0.35), b)

# 6 — CTA: cinematic rise to the lockup, warm resolve to the end
add(riser(5.2, 0.38), 108.4)
for k, t in enumerate([108.5, 109.5, 110.5, 111.5]):            # one low piano per «کمتر»
    add(piano([45, 41, 43, 48][k], 2.5, 0.55), snap(t))
add(thump(0.6), snap(113.65))
add(pad([36, 48, 55, 60, 64, 67], 13.4, 0.6, 2600), snap(113.65))
add(piano(48, 6.0, 0.7), snap(113.65)); add(piano(64, 6.0, 0.45), snap(113.65)); add(piano(67, 6.0, 0.4), snap(113.65))
for k, nt in enumerate([72, 76, 79, 84]):
    add(piano(nt, 3.0, 0.22), snap(120.4) + k * BEAT, pan=0.2)

# ---------- sfx on the grid ----------
for s in SCENE[1:]:
    add(whoosh(0.45, 0.10), snap(s) - 0.25, pan=0.2)
for t in (6.4, 8.0): add(buzz(0.6, 0.16), snap(t))                     # the ringing phone
add(thump(0.55), snap(22.2 + 1.88))                                     # paper stamp
for k in range(5): add(tick(0.18), snap(29.6 + 0.2 + k * 0.75))          # waiting clock
add(shimmer(1.8, 0.16), snap(46.2))                                     # particles
add(thump(0.75), snap(51.92))                                           # the mark presses
add(pop(86, 0.22), snap(58.0))                                          # import button
add(pop(88, 0.18), snap(59.8))                                          # tag chip
for k in range(4): add(pop(84 + 2 * k, 0.16), snap(76.4 + 0.6 * k))     # notification chips
add(pop(79, 0.3), snap(79.4))                                           # tap «تأیید»
add(pop(91, 0.18), snap(86.5))                                          # SMS arrives
add(pop(79, 0.26), snap(88.0))                                          # tap the link
for k in range(3): add(pop(86 + 3 * k, 0.2), snap(91.9 + 0.7 * k))      # delivered · opened · answered

# ---------- reverb + duck under the VO plan + master ----------
ir_n = int(SR * 2.4); ir_t = np.arange(ir_n) / SR
irL = rng.standard_normal(ir_n) * np.exp(-ir_t * 2.6); irR = rng.standard_normal(ir_n) * np.exp(-ir_t * 2.6)
irL = lp(irL, 5000); irR = lp(irR, 5000)
wetL = fftconvolve(L, irL)[:N] * 0.018; wetR = fftconvolve(R, irR)[:N] * 0.018
L, R = L + wetL, R + wetR

vo = json.load(open("vo/lines.json"))["lines"]
duck = np.ones(N)
for l in vo:
    a, b = t2i(l["at"] - 0.12), t2i(l["at"] + l["dur"] + 0.25)
    duck[a:b] = 0.42
k = int(SR * 0.18)
duck = np.convolve(duck, np.ones(k) / k, mode="same")                   # smooth attack / release
L *= duck; R *= duck

fade = np.ones(N); fo = t2i(2.5); fade[-fo:] = np.linspace(1, 0, fo) ** 2
L *= fade; R *= fade
peak = max(np.abs(L).max(), np.abs(R).max())
L, R = L / peak * 0.5, R / peak * 0.5                                    # headroom; loudness is set at the final mix

import os
os.makedirs("assets/audio", exist_ok=True)
sf.write("assets/audio/score.wav", np.stack([L, R], 1).astype(np.float32), SR, subtype="PCM_24")
json.dump({"bpm": BPM, "beat": BEAT, "beats": [round(b, 4) for b in np.arange(0, DUR, BEAT)]}, open("beats.json", "w"))
print("score.wav", DUR, "s  ·  beats.json", int(DUR / BEAT), "beats")
