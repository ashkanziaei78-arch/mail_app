/**
 * Persian voice-over with Fish Audio.
 *
 *   FISH_API_KEY=… FISH_VOICE_ID=… node tts-fish.mjs        # → vo/L01.wav … vo/L24.wav
 *   FISH_MODEL=s1 (default) | speech-1.6     FORCE=1 to regenerate existing files
 *
 * Only `text` from vo/lines.json is sent — it already carries the diacritics needed for
 * correct pronunciation. `direction` is never spoken; it is the brief for choosing / tuning
 * the voice. After synthesis each line is checked against its time budget (`dur`).
 */
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const KEY = process.env.FISH_API_KEY;
const VOICE = process.env.FISH_VOICE_ID;
const MODEL = process.env.FISH_MODEL || "s1";
if (!KEY) { console.error("FISH_API_KEY is required (and FISH_VOICE_ID for a male Persian voice)."); process.exit(1); }

const { lines } = JSON.parse(fs.readFileSync("vo/lines.json", "utf8"));
const seconds = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim());

let over = 0;
for (const l of lines) {
  const out = `vo/${l.id}.wav`;
  if (!process.env.FORCE && fs.existsSync(out) && fs.statSync(out).size > 1000) { console.log("skip", l.id); continue; }
  const res = await fetch("https://api.fish.audio/v1/tts", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", model: MODEL },
    body: JSON.stringify({ text: l.text, format: "wav", sample_rate: 44100, normalize: true, latency: "normal", ...(VOICE ? { reference_id: VOICE } : {}) }),
  });
  if (!res.ok) { console.error(`${l.id} failed: ${res.status} ${await res.text().catch(() => "")}`); process.exit(1); }
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  const s = seconds(out);
  const flag = s > l.dur + 0.4 ? `  ⚠ over budget ${l.dur}s` : "";
  if (flag) over++;
  console.log(`${l.id}  ${s.toFixed(2)}s / ${l.dur}s${flag}`);
}
console.log(over ? `\n${over} line(s) run long: shorten the text or move \`at\`, then re-run mix.` : "\nAll lines fit. Next: node mix.mjs");
