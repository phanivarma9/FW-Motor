"""Natural Telugu narration with Sarvam (bulbul:v3, speaker tarun).
Each line is a list of phrases; every phrase is synthesized on its own (trimmed), then joined with
hand-tuned pauses. Rank names are spoken slower for emphasis. Writes the timing file for the video.
Phrase tuple: (text, pace, pause_after_seconds)."""
import json, base64, subprocess, urllib.request, wave, os, hashlib
import numpy as np

NAME = 0.88   # slower, weighty rank names
TALK = 0.98   # natural explanation pace

LINES = [
 [("కానిస్టేబుల్ నుంచి... డీజీపీ దాకా.", TALK, 0.35), ("ఎవరి చేతిలో ఎంత పవర్ ఉంటుంది?", TALK, 0.3), ("ఒక్కొక్కటిగా చూద్దాం.", TALK, 0)],
 [("కానిస్టేబుల్.", NAME, 0.45), ("రోడ్డు మీద మనకు మొదట కనిపించేది వీళ్లే.", TALK, 0.25), ("గస్తీ, ట్రాఫిక్, బందోబస్తు... అన్నీ వీళ్ల డ్యూటీనే.", TALK, 0)],
 [("హెడ్ కానిస్టేబుల్.", NAME, 0.45), ("కానిస్టేబుళ్లకు లీడర్.", TALK, 0.25), ("స్టేషన్ రికార్డులన్నీ వీళ్ల చేతిలోనే ఉంటాయి.", TALK, 0)],
 [("ఏఎస్ఐ.", NAME, 0.45), ("కేసుల్ని దర్యాప్తు చేసే పవర్... ఇక్కడి నుంచే మొదలవుతుంది.", TALK, 0)],
 [("ఎస్ఐ.", NAME, 0.45), ("ఎఫ్ఐఆర్ రాయాలన్నా, అరెస్ట్ చేయాలన్నా...", TALK, 0.3), ("స్టేషన్‌కి బాస్ వీళ్లే.", TALK, 0)],
 [("సీఐ.", NAME, 0.45), ("ఒక్కరే... రెండు మూడు స్టేషన్లను కంట్రోల్ చేస్తారు.", TALK, 0)],
 [("డీఎస్పీ.", NAME, 0.45), ("సబ్ డివిజన్ మొత్తం... వీళ్ల ఆర్డర్ మీదే నడుస్తుంది.", TALK, 0)],
 [("అడిషనల్ ఎస్పీ.", NAME, 0.45), ("జిల్లాలో ఎస్పీకి కుడిభుజం.", TALK, 0)],
 [("ఎస్పీ.", NAME, 0.45), ("జిల్లా మొత్తం పోలీస్ ఫోర్స్... వీళ్ల చేతిలో.", TALK, 0)],
 [("ఎస్ఎస్పీ.", NAME, 0.45), ("పెద్ద జిల్లాలకు... సీనియర్ బాస్.", TALK, 0)],
 [("డీఐజీ.", NAME, 0.45), ("రెండు మూడు జిల్లాలు కలిపిన రేంజ్‌కు అధిపతి.", TALK, 0)],
 [("ఐజీ.", NAME, 0.45), ("ఒక జోన్ మొత్తం... వీళ్ల కంట్రోల్‌లో.", TALK, 0)],
 [("అడిషనల్ డీజీపీ.", NAME, 0.45), ("ఇంటెలిజెన్స్, లా అండ్ ఆర్డర్...", TALK, 0.25), ("ఇలాంటి కీలక విభాగాలకు అధిపతి.", TALK, 0)],
 [("ఇక... డీజీపీ.", NAME, 0.55), ("రాష్ట్రంలోని ప్రతి పోలీస్... వీళ్ల కిందే!", TALK, 0)],
 [("పోలీస్ అవ్వాలనుకునే మీ ఫ్రెండ్‌కి...", TALK, 0.25), ("ఈ వీడియో షేర్ చేయండి!", TALK, 0)],
]
FPS = 30
SR = 44100
CACHE = "public/audio/police-vo/phrases"
os.makedirs(CACHE, exist_ok=True)

def tts(text, pace):
    key = hashlib.md5(f"{text}|{pace}|tarun|v3|t0.75".encode()).hexdigest()[:12]
    out = f"{CACHE}/{key}.wav"
    if not os.path.exists(out):
        body = json.dumps({"text": text, "target_language_code": "te-IN", "speaker": "tarun", "model": "bulbul:v3",
                           "pace": pace, "temperature": 0.75}).encode()
        req = urllib.request.Request("https://api.sarvam.ai/text-to-speech", data=body, method="POST",
            headers={"Content-Type": "application/json", "api-subscription-key": "proxy-injected"})
        d = json.load(urllib.request.urlopen(req, timeout=60))
        raw = out + ".raw.wav"
        open(raw, "wb").write(base64.b64decode(d["audios"][0]))
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af",
            "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse",
            "-ar", str(SR), "-ac", "1", out], check=True)
        os.remove(raw)
    with wave.open(out) as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64)

def fade(x, ms=12):
    n = int(SR * ms / 1000)
    if len(x) > 2 * n:
        x[:n] *= np.linspace(0, 1, n); x[-n:] *= np.linspace(1, 0, n)
    return x

durs = []
for i, phrases in enumerate(LINES):
    parts = []
    for text, pace, pause in phrases:
        parts.append(fade(tts(text, pace)))
        if pause: parts.append(np.zeros(int(SR * pause)))
    line = np.concatenate(parts)
    with wave.open(f"public/audio/police-vo/line{i:02d}.wav", "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(np.clip(line, -32767, 32767).astype(np.int16).tobytes())
    durs.append(len(line) / SR)
    print(i, round(durs[-1], 2))
intro = max(round((durs[0] + 0.35) * FPS), 84)
ranks = [max(round((d + 0.55) * FPS), 105) for d in durs[1:-1]]
outro = round((durs[-1] + 1.5) * FPS)
json.dump({"intro": intro, "ranks": ranks, "outro": outro, "voice": [round(d, 3) for d in durs]},
          open("src/videos/police-timing.json", "w"), indent=1)
print("total s", (intro + sum(ranks) + outro) / FPS)
