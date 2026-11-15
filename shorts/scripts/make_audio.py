"""Generate a soft ambient bed + step clicks, synced to frame timings.
Usage: python3 scripts/make_audio.py out.wav duration_s click_times_csv chime_time
"""
import sys, wave, numpy as np

SR = 44100
out, dur = sys.argv[1], float(sys.argv[2])
clicks = [float(x) for x in sys.argv[3].split(",")] if len(sys.argv) > 3 and sys.argv[3] else []
chime_t = float(sys.argv[4]) if len(sys.argv) > 4 else None
n = int(SR * dur)
t = np.arange(n) / SR
mix = np.zeros(n)

def note(f):  # midi -> hz
    return 440 * 2 ** ((f - 69) / 12)

# Am - F - C - G pad, 3.2 s per chord (4 steps at 0.8 s)
chords = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]]
seg = 3.2
for i in range(int(np.ceil(dur / seg))):
    s0 = i * seg
    idx = (t >= s0 - 0.4) & (t < s0 + seg + 1.2)
    tt = t[idx] - s0
    env = np.clip(tt / 0.9, 0, 1) * np.clip((seg + 1.2 - tt) / 1.4, 0, 1)
    for m in chords[i % 4]:
        f = note(m)
        for det in (-0.12, 0.0, 0.12):
            ff = f * 2 ** (det / 12)
            mix[idx] += 0.022 * env * (np.sin(2 * np.pi * ff * tt) + 0.25 * np.sin(4 * np.pi * ff * tt))
    # soft sub
    root = note(chords[i % 4][0] - 12)
    mix[idx] += 0.05 * env * np.sin(2 * np.pi * root * tt)

# step clicks: woody tick
for c in clicks:
    i0 = int(c * SR)
    L = int(0.18 * SR)
    if i0 + L > n: continue
    tt = np.arange(L) / SR
    tick = np.sin(2 * np.pi * 1250 * tt) * np.exp(-tt * 70) * 0.5
    tick += np.sin(2 * np.pi * 180 * tt) * np.exp(-tt * 30) * 0.45
    rng = np.random.default_rng(i0)
    tick += rng.normal(0, 1, L) * np.exp(-tt * 160) * 0.12
    mix[i0:i0 + L] += tick * 0.55

# arrival chime
if chime_t is not None:
    i0 = int(chime_t * SR)
    L = min(n - i0, int(4.5 * SR))
    tt = np.arange(L) / SR
    for m, a in ((81, 0.12), (76, 0.09), (88, 0.05), (69, 0.08)):
        f = note(m)
        mix[i0:i0 + L] += a * np.sin(2 * np.pi * f * tt) * np.exp(-tt * 1.1)

# cheap stereo reverb
def delay(x, d, g):
    k = int(d * SR); y = np.zeros_like(x); y[k:] = x[:-k] * g; return y
wetL = delay(mix, 0.083, 0.35) + delay(mix, 0.211, 0.25) + delay(mix, 0.377, 0.15)
wetR = delay(mix, 0.097, 0.35) + delay(mix, 0.233, 0.25) + delay(mix, 0.401, 0.15)
L_ = mix + wetL; R_ = mix + wetR
fade = np.clip((dur - t) / 1.5, 0, 1) * np.clip(t / 0.3, 0, 1)
st = np.stack([L_ * fade, R_ * fade], axis=1)
st = st / np.max(np.abs(st)) * 0.85
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype(np.int16).tobytes())
print("wrote", out)
