// Contact sheet of stills from one bundle: node scripts/sheet.mjs <CompId> <outdir> <frames...>
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const [comp, out, ...frames] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browserExecutable = fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : null;
const chromiumOptions = { gl: "swangle" };
const composition = await selectComposition({ serveUrl, id: comp, browserExecutable, chromiumOptions });
const files = [];
for (const f of frames) {
  const file = path.join(out, `${f}.png`);
  await renderStill({ serveUrl, composition, frame: Number(f), output: file, scale: Number(process.env.SCALE || 0.33), browserExecutable, chromiumOptions, overwrite: true });
  files.push(file);
}
execFileSync("ffmpeg", ["-v", "error", "-y", ...files.flatMap((f) => ["-i", f]), "-filter_complex", files.map((_, i) => `[${i}:v]`).join("") + `hstack=inputs=${files.length}`, path.join(out, "sheet.png")]);
console.log(path.join(out, "sheet.png"));
