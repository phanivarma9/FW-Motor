# Music bed + SFX for PoliceRanks. Timings mirror src/videos/PoliceRanks.tsx
import sys, numpy as np
sys.path.insert(0, "scripts")
from sfx import *

import json
T = json.load(open("src/videos/police-timing.json"))
FPS = 30; INTRO = T["intro"]; LENS = T["ranks"]; N = len(LENS); OUTRO = T["outro"]
STARTS = [INTRO + sum(LENS[:k]) for k in range(N)]
END = INTRO + sum(LENS)
DUR = (END + OUTRO) / FPS
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
# ---- hook SFX, synced to CUTS = [0, 10, 20, 33, 45, 60] in PoliceRanks.tsx ----
F = lambda fr: fr / FPS
def metal(f0=2100):
    t = tt(1.0)
    return sum(np.sin(2*np.pi*f*t) * np.exp(-t * d) for f, d in ((f0, 8), (f0 * 1.5, 11), (f0 * 2.1, 15))) * 0.14
def hit():
    t = tt(0.35); r = np.random.default_rng(11)
    return (np.sin(2*np.pi*np.cumsum(90*np.exp(-t*12)+40)/SR) * np.exp(-t*9) + r.normal(0,1,len(t))*np.exp(-t*30)*0.35)
m.add(F(0), boom(), 0.9); m.add(F(0), metal(1800), 1.0)            # insignia impact
m.add(F(9), whoosh(0.35), 0.8); m.add(F(10), hit(), 0.6)           # snap zoom to eyes
for i in range(13):                                                # step lights igniting
    t = tt(0.12); f = 900 * 2 ** (i / 9)
    m.add(F(20 + i * 0.9), np.sin(2*np.pi*f*t) * np.exp(-t * 40) * 0.5, 0.6)
m.add(F(32), whoosh(0.45), 0.9)                                    # whip along the line
m.add(F(36), thud(), 0.7); m.add(F(40), thud(), 0.7)               # salute stomps
m.add(F(44), riser(0.12), 0.4); m.add(F(45), boom(), 1.0); m.add(F(45), hit(), 0.9)   # 13 RANKS slam
m.add(F(59), whoosh(0.3), 0.6); m.add(F(60), hit(), 0.7); m.add(F(60), metal(2600), 0.7)  # title
m.add(F(INTRO - 14), whoosh(0.5), 0.8)                             # whip into rank 1
m.add(F(INTRO) - 0.03, boom(), 0.55)

# per-rank: whoosh on the camera whip, metallic clink when the insignia pops
for k in range(N):
    s = STARTS[k] / FPS
    if k > 0: m.add(s - 0.08, whoosh(0.5), 0.55)
    clk = tt(0.9)
    clink = sum(np.sin(2*np.pi*f*clk) * np.exp(-clk * d) for f, d in ((2100, 9), (3150, 12), (4400, 16))) * 0.12
    m.add(s + 0.15, clink, 0.9)
    # salute stomp
    m.add(s + 16 / FPS, thud(), 0.35)
# outro
o = END / FPS
m.add(o, whoosh(0.8), 0.6)
m.add(o + 0.2, chord([62, 65, 69, 74], 3.5, 0.06))
m.save("public/audio/police.wav")
print("ok", round(DUR, 2))
