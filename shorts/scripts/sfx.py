"""Tiny procedural SFX library. All sounds are synthesized (no licensing issues)."""
import wave, numpy as np

SR = 44100

def note(m):
    return 440 * 2 ** ((m - 69) / 12)

class Mix:
    def __init__(self, dur):
        self.n = int(SR * dur); self.dur = dur
        self.L = np.zeros(self.n); self.R = np.zeros(self.n)

    def add(self, t0, sig, gain=1.0, pan=0.0):
        i0 = int(t0 * SR)
        if i0 >= self.n or i0 < 0: return
        sig = sig[: self.n - i0] * gain
        self.L[i0:i0 + len(sig)] += sig * (1 - max(0, pan))
        self.R[i0:i0 + len(sig)] += sig * (1 + min(0, pan))

    def save(self, path, reverb=True):
        L, R = self.L, self.R
        if reverb:
            def d(x, s, g):
                k = int(s * SR); y = np.zeros_like(x); y[k:] = x[:-k] * g; return y
            L = L + d(L, .083, .3) + d(L, .211, .22) + d(L, .377, .14)
            R = R + d(R, .097, .3) + d(R, .233, .22) + d(R, .401, .14)
        t = np.arange(self.n) / SR
        fade = np.clip((self.dur - t) / 1.2, 0, 1) * np.clip(t / 0.05, 0, 1)
        st = np.stack([L * fade, R * fade], 1)
        st = st / (np.max(np.abs(st)) + 1e-9) * 0.89
        with wave.open(path, "wb") as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((st * 32767).astype(np.int16).tobytes())

def tt(sec):
    return np.arange(int(sec * SR)) / SR

def tick(pitch=1250):
    t = tt(0.18); r = np.random.default_rng(int(pitch))
    return (np.sin(2*np.pi*pitch*t)*np.exp(-t*70)*.5 + np.sin(2*np.pi*180*t)*np.exp(-t*30)*.45
            + r.normal(0, 1, len(t))*np.exp(-t*160)*.12)

def drop(start=900, end=180, sec=0.5):
    t = tt(sec); f = start * (end / start) ** (t / sec)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 3) * 0.5

def thud():
    t = tt(0.6); f = 110 * np.exp(-t * 6) + 40
    return np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t * 7) * 0.9

def riser(sec=2.0):
    t = tt(sec); r = np.random.default_rng(3)
    noise = r.normal(0, 1, len(t))
    # crude high-pass sweep via differencing blend
    hp = np.diff(noise, prepend=0)
    f = 200 * (8 ** (t / sec))
    tone = np.sin(2*np.pi*np.cumsum(f)/SR)
    env = (t / sec) ** 2
    return (hp * 0.25 + tone * 0.3) * env

def whoosh(sec=1.2):
    t = tt(sec); r = np.random.default_rng(5)
    n = r.normal(0, 1, len(t))
    k = 40; sm = np.convolve(n, np.ones(k) / k, mode="same")
    env = np.sin(np.pi * np.clip(t / sec, 0, 1)) ** 2
    return (sm * 3 + np.diff(n, prepend=0) * .15) * env * 0.6

def boom():
    t = tt(2.5); f = 70 * np.exp(-t * 2) + 32
    return (np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t * 1.6) * 1.0
            + np.random.default_rng(9).normal(0, 1, len(t)) * np.exp(-t * 18) * .25)

def chord(midis, sec=4.0, gain=0.1):
    t = tt(sec); out = np.zeros(len(t))
    for m in midis:
        for det in (-0.1, 0, 0.1):
            out += np.sin(2*np.pi*note(m)*2**(det/12)*t)
    return out * gain * np.clip(t / 0.4, 0, 1) * np.exp(-t * 0.6)

def pad(mix, chords, seg, gain=0.022, until=None):
    until = until or mix.dur
    for i in range(int(np.ceil(until / seg))):
        s0 = i * seg; L = min(seg + 1.2, until - s0 + 0.6)
        if L <= 0: break
        t = tt(L); env = np.clip(t / 0.9, 0, 1) * np.clip((L - t) / 1.2, 0, 1)
        sig = np.zeros(len(t))
        for m in chords[i % len(chords)]:
            for det in (-0.12, 0, 0.12):
                ff = note(m) * 2 ** (det / 12)
                sig += np.sin(2*np.pi*ff*t) + 0.25*np.sin(4*np.pi*ff*t)
        sig = sig * gain + 0.05 * np.sin(2*np.pi*note(chords[i % len(chords)][0]-12)*t)
        mix.add(s0, sig * env)
