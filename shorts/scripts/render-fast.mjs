// Fast CPU render: splits the video into N chunks, each in its own browser process
// (each gets its own software-GL process, so cores are actually used in parallel),
// renders audio separately, then joins + upscales to 1080x1920.
// Usage: node scripts/render-fast.mjs <CompId> <out-name> [chunks=4]
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { execFileSync, spawn } from "child_process";
import fs from "fs";
import path from "path";

const [comp, name = comp, chunksArg = "4", workerRange] = process.argv.slice(2);
const browserExecutable = fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : null;
const chromiumOptions = { gl: "swangle" };
const tmp = path.resolve(`out/.tmp-${name}`);

if (workerRange) {
  // ---- worker mode: render one frame range, video only ----
  const [serveUrl, a, b, file] = workerRange.split("|");
  const composition = await selectComposition({ serveUrl, id: comp, browserExecutable, chromiumOptions });
  let last = -1;
  await renderMedia({
    serveUrl, composition, codec: "h264", outputLocation: file, scale: Number(process.env.SCALE || 1), concurrency: 1, muted: true, jpegQuality: 95, crf: 12,
    frameRange: [Number(a), Number(b)], timeoutInMilliseconds: 180000, browserExecutable, chromiumOptions, overwrite: true,
    onProgress: ({ renderedFrames }) => {
      if (renderedFrames - last >= 15) { last = renderedFrames; console.log(`chunk ${a}-${b}: ${renderedFrames}/${Number(b) - Number(a) + 1}`); }
    },
  });
  process.exit(0);
}

fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });
const t0 = Date.now();
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: comp, browserExecutable, chromiumOptions });
// optional sub-range for tests: FRAMES=0-125
const [f0, f1] = (process.env.FRAMES || `0-${composition.durationInFrames - 1}`).split("-").map(Number);
const total = f1 - f0 + 1;
const n = Number(chunksArg);
const size = Math.ceil(total / n);
const parts = [];
await Promise.all(
  Array.from({ length: n }, (_, i) => {
    const a = f0 + i * size;
    const b = Math.min(f1, a + size - 1);
    const file = path.join(tmp, `part${i}.mp4`);
    parts.push(file);
    return new Promise((res, rej) => {
      const p = spawn(process.execPath, [process.argv[1], comp, name, chunksArg, `${serveUrl}|${a}|${b}|${file}`], { stdio: ["ignore", "inherit", "inherit"] });
      p.on("exit", (code) => (code === 0 ? res() : rej(new Error(`chunk ${i} failed (${code})`))));
    });
  }),
);
// audio track for the full composition
// audio: a pre-mixed master (AUDIO=public/audio/x.wav) is instant; otherwise let Remotion collect it
let audio = path.join(tmp, "audio.wav");
if (process.env.AUDIO) {
  const fps = composition.fps;
  execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(f0 / fps), "-t", String(total / fps), "-i", process.env.AUDIO, audio]);
} else {
  await renderMedia({ serveUrl, composition, codec: "wav", outputLocation: audio, browserExecutable, chromiumOptions, overwrite: true, frameRange: [f0, f1], timeoutInMilliseconds: 240000 });
}
fs.writeFileSync(path.join(tmp, "list.txt"), parts.map((p) => `file '${p}'`).join("\n"));
const final = `out/${name}.mp4`;
execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(tmp, "list.txt"), "-i", audio,
  "-map", "0:v", "-map", "1:a", "-vf", "scale=1080:1920:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-crf", "15",
  "-profile:v", "high", "-pix_fmt", "yuv420p", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", final]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log("DONE", final, `${((Date.now() - t0) / 60000).toFixed(1)} min`);
