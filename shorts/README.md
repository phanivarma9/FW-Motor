# Shorts: 3D life-lesson videos (Remotion + three.js)

Vertical 1080×1920 shorts in a minimalist 3D pictogram style, built for Reels, Shorts and TikTok.

```bash
npm i
npm run dev                                   # Remotion Studio preview
npx remotion render StairsOfConsistency out/stairs.mp4
node scripts/sheet.mjs StairsOfConsistency /tmp/sheet 30 200 400   # quick stills contact sheet
python3 scripts/make_audio.py public/audio/x.wav <seconds> <click_times_csv> <chime_time>
```

- `src/lib/rig.ts`: pose model, keyframe helpers
- `src/lib/StickFigure.tsx`: pose-driven 3D pictogram figure
- `src/lib/Stage.tsx`: lights, mirror floor, instanced bricks
- `src/lib/stairs.ts`: stair geometry + climb / tired / sit / cheer poses
- `src/lib/Hud.tsx`: labels, hook and payoff text
- `src/videos/*`: one file per video
- `CONCEPTS.md`: concept backlog

Change the watermark handle in `src/Root.tsx` (`defaultProps.handle`).
WebGL renders on CPU (`swangle`) so it works on machines without a GPU.
