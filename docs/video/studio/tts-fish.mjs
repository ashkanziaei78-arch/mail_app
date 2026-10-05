/**
 * تولید صدای فارسی با Fish Audio.
 *
 *   FISH_API_KEY=xxx FISH_VOICE_ID=yyy node tts-fish.mjs
 *
 * هر خطِ vo/lines.json یک فایل جداگانه می‌شود: vo/L01.wav ...
 * متن‌ها از پیش اعراب‌گذاری شده‌اند تا تلفظ درست در بیاید؛ دست نزنید.
 */
import fs from "node:fs";

const KEY = process.env.FISH_API_KEY;
const VOICE = process.env.FISH_VOICE_ID;           // شناسهٔ صدای فارسی در پنل Fish
const MODEL = process.env.FISH_MODEL || "s1";      // s1 | speech-1.6
if (!KEY) { console.error("FISH_API_KEY لازم است."); process.exit(1); }

const { lines } = JSON.parse(fs.readFileSync("vo/lines.json", "utf8"));

for (const l of lines) {
  const out = `vo/${l.id}.wav`;
  if (fs.existsSync(out) && fs.statSync(out).size > 1000) { console.log("skip", l.id); continue; }

  const body = {
    text: l.text,
    format: "wav",
    normalize: true,
    latency: "normal",
    ...(VOICE ? { reference_id: VOICE } : {}),
  };

  const res = await fetch("https://api.fish.audio/v1/tts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${KEY}`,
      "Content-Type": "application/json",
      "model": MODEL,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error(`${l.id} failed: ${res.status} ${await res.text().catch(() => "")}`);
    process.exit(1);
  }
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  const sec = (fs.statSync(out).size / (48000 * 2)).toFixed(1);
  const fit = Math.abs(sec - l.dur) > 1.2 ? `  ⚠ بودجه ${l.dur}s` : "";
  console.log(`${l.id}  ${sec}s${fit}`);
}
console.log("\nتمام شد. حالا:  node mux-vo.mjs");
