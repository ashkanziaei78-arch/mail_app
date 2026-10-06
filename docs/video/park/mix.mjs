/**
 * Final soundtrack: score (music + sfx, already ducked under the VO plan) + every VO line
 * placed at its exact `at`, then loudness-normalised to −14 LUFS / −1 dBTP (two-pass loudnorm).
 *
 *   node mix.mjs            → assets/audio/mix.wav  + audio_meta.json (the composition's audio track)
 *
 * Without vo/*.wav (no Fish key yet) the mix is the score alone, so the film still renders.
 */
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const { lines } = JSON.parse(fs.readFileSync("vo/lines.json", "utf8"));
const have = lines.filter((l) => fs.existsSync(`vo/${l.id}.wav`));
const inputs = ["-i", "assets/audio/score.wav", ...have.flatMap((l) => ["-i", `vo/${l.id}.wav`])];

// VO bus: each line delayed to its slot, light EQ + compression so it sits on top of the bed
const delay = (l) => Math.round(l.at * 1000);
const voChain = have.map((l, i) => `[${i + 1}:a]aresample=48000,pan=stereo|c0=c0|c1=c0,adelay=${delay(l)}|${delay(l)}[v${i}]`).join(";");
const bus = have.length
  ? `${voChain};${have.map((_, i) => `[v${i}]`).join("")}amix=inputs=${have.length}:normalize=0,highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=120[vo];[0:a][vo]amix=inputs=2:normalize=0:duration=first[pre]`
  : "[0:a]anull[pre]";

const ff = (args) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-y", ...args], { encoding: "utf8" });
  if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
  return r.stderr;
};

// pass 1 — measure
const log = ff([...inputs, "-filter_complex", `${bus};[pre]loudnorm=I=-14:TP=-1:LRA=11:print_format=json[out]`, "-map", "[out]", "-f", "null", "-"]);
const m = JSON.parse(log.slice(log.lastIndexOf("{"), log.lastIndexOf("}") + 1));
// pass 2 — apply the measured values (linear: keeps the dynamics of the mix)
const ln = `loudnorm=I=-14:TP=-1:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
fs.mkdirSync("assets/audio", { recursive: true });
ff([...inputs, "-filter_complex", `${bus};[pre]${ln},aresample=48000[out]`, "-map", "[out]", "-c:a", "pcm_s24le", "assets/audio/mix.wav"]);

fs.writeFileSync("audio_meta.json", JSON.stringify({ bgm: { path: "assets/audio/mix.wav", volume: 1.0 }, voices: [], sfx: [] }, null, 2) + "\n");
const check = ff(["-i", "assets/audio/mix.wav", "-af", "ebur128=peak=true", "-f", "null", "-"]).split("\n").filter((x) => /I:|Peak:/.test(x)).slice(-2).join("\n");
console.log(`mix.wav — VO lines: ${have.length}/${lines.length}\n${check}`);
