# Music bed + SFX for PoliceRanks. Timings mirror src/videos/PoliceRanks.tsx
import sys, numpy as np
sys.path.insert(0, "scripts")
from sfx import *

FPS = 30; INTRO = 84; PER = 126; N = 13; OUTRO = 96
DUR = (INTRO + N * PER + OUTRO) / FPS
m = Mix(DUR)

# --- driving beat, 100 BPM (0.6 s), cinematic-trap feel ---
beat = 0.6
def kick():
    t = tt(0.45); f = 120 * np.exp(-t * 18) + 45
    return np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t * 6)
def hat():
    t = tt(0.06); return np.random.default_rng(1).normal(0, 1, len(t)) * np.exp(-t * 90) * 0.25
def snare():
    t = tt(0.25); r = np.random.default_rng(2)
    return (r.normal(0, 1, len(t)) * np.exp(-t * 22) * 0.5 + np.sin(2*np.pi*190*t) * np.exp(-t * 25) * 0.4)

start = INTRO / FPS - 0.05
nb = int((DUR - start - 1.5) / beat)
for b in range(nb):
    t0 = start + b * beat
    if b % 4 in (0, 2) or b % 8 == 7: m.add(t0, kick(), 0.55)
    if b % 4 == 2: m.add(t0, snare(), 0.32)
    m.add(t0 + beat / 2, hat(), 0.5)
    m.add(t0, hat(), 0.25)
# dark minor bass/pad line: i - VI - III - VII (D minor)
pad(m, [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]], beat * 8, gain=0.018)
# intro swell
m.add(0, riser(INTRO / FPS), 0.5)
m.add(INTRO / FPS - 0.05, boom(), 0.7)

# per-rank: whoosh on the camera whip, metallic clink when the insignia pops
for k in range(N):
    s = (INTRO + k * PER) / FPS
    if k > 0: m.add(s - 0.08, whoosh(0.5), 0.55)
    clk = tt(0.9)
    clink = sum(np.sin(2*np.pi*f*clk) * np.exp(-clk * d) for f, d in ((2100, 9), (3150, 12), (4400, 16))) * 0.12
    m.add(s + 0.15, clink, 0.9)
    # salute stomp
    m.add(s + 16 / FPS, thud(), 0.35)
# outro
o = (INTRO + N * PER) / FPS
m.add(o, whoosh(0.8), 0.6)
m.add(o + 0.2, chord([62, 65, 69, 74], 3.5, 0.06))
m.save("public/audio/police.wav")
print("ok", round(DUR, 2))
