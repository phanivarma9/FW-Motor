"""Generate Telugu voiceover lines with Sarvam (bulbul:v3, speaker tarun) and write the timing file
that drives the PoliceRanks video. Key is injected by the network proxy (header placeholder)."""
import json, base64, subprocess, urllib.request, wave, os
LINES = [
 "కానిస్టేబుల్ నుంచి డీజీపీ దాకా... ఎవరి చేతిలో ఎంత పవర్? చూద్దాం!",
 "కానిస్టేబుల్. రోడ్డు మీద మనకు మొదట కనిపించే పోలీస్. గస్తీ, ట్రాఫిక్, బందోబస్తు.",
 "హెడ్ కానిస్టేబుల్. కానిస్టేబుళ్లకు లీడర్. స్టేషన్ రికార్డులన్నీ ఇతని చేతిలోనే.",
 "ఏఎస్ఐ. కేసులు దర్యాప్తు చేసే పవర్ ఇక్కడి నుంచే మొదలవుతుంది.",
 "ఎస్ఐ. ఎఫ్ఐఆర్ రాయాలన్నా, అరెస్ట్ చేయాలన్నా... స్టేషన్‌కి బాస్ ఇతనే.",
 "సీఐ. ఒక్కడే రెండు మూడు స్టేషన్లను కంట్రోల్ చేస్తాడు.",
 "డీఎస్పీ. సబ్ డివిజన్ మొత్తం ఇతని ఆర్డర్ మీదే నడుస్తుంది.",
 "అడిషనల్ ఎస్పీ. జిల్లాలో ఎస్పీకి కుడిభుజం.",
 "ఎస్పీ. జిల్లా మొత్తం పోలీస్ ఫోర్స్ ఇతని చేతిలో.",
 "ఎస్ఎస్పీ. పెద్ద జిల్లాలకు సీనియర్ బాస్.",
 "డీఐజీ. రెండు మూడు జిల్లాలు కలిపిన రేంజ్‌కు అధిపతి.",
 "ఐజీ. ఒక జోన్ మొత్తం ఇతని కంట్రోల్‌లో.",
 "అడిషనల్ డీజీపీ. ఇంటెలిజెన్స్, లా అండ్ ఆర్డర్ లాంటి కీలక విభాగాల అధిపతి.",
 "ఇక డీజీపీ... రాష్ట్రంలోని ప్రతి పోలీస్ ఇతని కిందే!",
 "పోలీస్ అవ్వాలనుకునే మీ ఫ్రెండ్‌కి ఈ వీడియో షేర్ చేయండి!",
]
FPS = 30
os.makedirs("public/audio/police-vo", exist_ok=True)
durs = []
for i, text in enumerate(LINES):
    out = f"public/audio/police-vo/line{i:02d}.wav"
    if not os.path.exists(out):
        body = json.dumps({"text": text, "target_language_code": "te-IN", "speaker": "tarun", "model": "bulbul:v3", "pace": 1.15}).encode()
        req = urllib.request.Request("https://api.sarvam.ai/text-to-speech", data=body, method="POST",
            headers={"Content-Type": "application/json", "api-subscription-key": "proxy-injected"})
        d = json.load(urllib.request.urlopen(req, timeout=60))
        raw = out + ".raw.wav"
        open(raw, "wb").write(base64.b64decode(d["audios"][0]))
        # trim leading/trailing silence so timing is tight
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af",
            "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse",
            "-ar", "44100", "-ac", "1", out], check=True)
        os.remove(raw)
    with wave.open(out) as w:
        durs.append(w.getnframes() / w.getframerate())
    print(i, round(durs[-1], 2))
intro = max(round((durs[0] + 0.35) * FPS), 84)
ranks = [max(round((d + 0.55) * FPS), 96) for d in durs[1:-1]]
outro = round((durs[-1] + 1.2) * FPS)
json.dump({"intro": intro, "ranks": ranks, "outro": outro, "voice": [round(d, 3) for d in durs]},
          open("src/videos/police-timing.json", "w"), indent=1)
print("total s", (intro + sum(ranks) + outro) / FPS)
