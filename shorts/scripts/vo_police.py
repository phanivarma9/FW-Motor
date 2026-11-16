"""Generate Telugu voiceover lines with Sarvam (bulbul:v3, speaker tarun) and write the timing file
that drives the PoliceRanks video. Key is injected by the network proxy (header placeholder)."""
import json, base64, subprocess, urllib.request, wave, os
LINES = [
 "పోలీస్ ర్యాంకులు... ఎవరికి ఎంత పవర్? కింద నుంచి పైకి చూద్దాం!",
 "కానిస్టేబుల్. గస్తీ, ట్రాఫిక్, ప్రజల భద్రత. పోలీస్ వ్యవస్థకు పునాది.",
 "హెడ్ కానిస్టేబుల్. కానిస్టేబుళ్లను నడిపిస్తారు, స్టేషన్ రికార్డులు చూస్తారు.",
 "ఏఎస్ఐ. చిన్న కేసుల దర్యాప్తు, ఎస్ఐకి కుడిచేయి.",
 "ఎస్ఐ. ఎఫ్ఐఆర్ నమోదు, దర్యాప్తు, అరెస్ట్ చేసే అధికారం.",
 "సీఐ. సర్కిల్‌లోని స్టేషన్లను పర్యవేక్షిస్తారు.",
 "డీఎస్పీ. సబ్ డివిజన్ మొత్తానికి బాధ్యత.",
 "అడిషనల్ ఎస్పీ. జిల్లాలో ఎస్పీకి కుడిభుజం.",
 "ఎస్పీ. జిల్లా మొత్తం పోలీస్ బాస్.",
 "ఎస్ఎస్పీ. పెద్ద జిల్లాలకు సీనియర్ ఎస్పీ.",
 "డీఐజీ. కొన్ని జిల్లాల రేంజ్‌కు అధిపతి.",
 "ఐజీ. జోన్ మొత్తాన్ని పర్యవేక్షిస్తారు.",
 "అడిషనల్ డీజీపీ. ఇంటెలిజెన్స్, లా అండ్ ఆర్డర్ వంటి విభాగాల అధిపతి.",
 "డీజీపీ. రాష్ట్ర పోలీస్ దళానికి అత్యున్నత అధికారి!",
 "మీకు ఏ ర్యాంక్ అంటే ఇష్టం? కామెంట్‌లో చెప్పండి!",
]
FPS = 30
os.makedirs("public/audio/police-vo", exist_ok=True)
durs = []
for i, text in enumerate(LINES):
    out = f"public/audio/police-vo/line{i:02d}.wav"
    if not os.path.exists(out):
        body = json.dumps({"text": text, "target_language_code": "te-IN", "speaker": "tarun", "model": "bulbul:v3", "pace": 1.12}).encode()
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
