/**
 * چیدنِ خط‌های صدا سرِ جایِ دقیقِ خودشان روی فیلمِ بی‌صدا.
 *
 *   node mux-vo.mjs [ورودی.mp4] [خروجی.mp4]
 *
 * هر فایل با adelay به ثانیهٔ خودش می‌رود و همه با amix جمع می‌شوند.
 * موسیقی اینجا اضافه نمی‌شود — جای آن برای شما باز است.
 */
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const IN = process.argv[2] || "میلینگ-پرس.mp4";
const OUT = process.argv[3] || "میلینگ-پرس-باصدا.mp4";
const { lines } = JSON.parse(fs.readFileSync("vo/lines.json", "utf8"));

const have = lines.filter(l => fs.existsSync(`vo/${l.id}.wav`));
if (!have.length) { console.error("هیچ فایلِ صدایی در vo/ نیست. اول tts-fish.mjs را اجرا کنید."); process.exit(1); }
if (have.length < lines.length) console.warn(`هشدار: ${lines.length - have.length} خط هنوز ساخته نشده.`);

const args = ["-y", "-i", IN];
have.forEach(l => args.push("-i", `vo/${l.id}.wav`));

const chains = have.map((l, i) =>
  `[${i + 1}:a]aresample=48000,adelay=${Math.round(l.at * 1000)}|${Math.round(l.at * 1000)}[a${i}]`);
const mix = have.map((_, i) => `[a${i}]`).join("");
const filter = [
  ...chains,
  `${mix}amix=inputs=${have.length}:dropout_transition=0:normalize=0[vo]`,
  `[vo]loudnorm=I=-16:TP=-1.5:LRA=9,alimiter=limit=0.95[out]`,
].join(";");

args.push("-filter_complex", filter, "-map", "0:v", "-map", "[out]",
  "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", OUT);

execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" });
console.log("ساخته شد:", OUT);
