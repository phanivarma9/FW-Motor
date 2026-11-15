// Render with progress logging: node scripts/render.mjs <CompId> <out-name>
// Renders at 75% on CPU, then upscales to 1080x1920 for posting.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const [comp, name = comp] = process.argv.slice(2);
fs.mkdirSync("out", { recursive: true });
const raw = `out/.${name}-raw.mp4`;
const final = `out/${name}.mp4`;
const browserExecutable = fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : null;
const chromiumOptions = { gl: "swangle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: comp, browserExecutable, chromiumOptions });
const t0 = Date.now();
let last = -1;
await renderMedia({
  serveUrl, composition, codec: "h264", outputLocation: raw, scale: 0.75, concurrency: 4,
  timeoutInMilliseconds: 180000, browserExecutable, chromiumOptions, overwrite: true,
  onProgress: ({ renderedFrames }) => {
    if (renderedFrames - last >= 30) {
      last = renderedFrames;
      const s = (Date.now() - t0) / 1000;
      const eta = renderedFrames ? (s / renderedFrames) * (composition.durationInFrames - renderedFrames) : 0;
      console.log(`${renderedFrames}/${composition.durationInFrames} frames  ${s.toFixed(0)}s  eta ${eta.toFixed(0)}s`);
    }
  },
});
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", raw, "-vf", "scale=1080:1920:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", final]);
fs.rmSync(raw);
console.log("DONE", final, `${((Date.now() - t0) / 60000).toFixed(1)} min`);
