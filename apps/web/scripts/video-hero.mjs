#!/usr/bin/env node
/**
 * The hero's presentation video (ADR-0023, Phase 2): from the owner's original to the files the site
 * serves. The original goes in apps/web/media-src/hero/ (never served, not in git); this command
 * writes public/media/hero/:
 *   hero-1080.mp4 / hero-1080.webm   computer (1920 wide), H.264 with faststart and VP9, no sound
 *   hero-720.mp4  / hero-720.webm    phone (1280 wide, or 720 wide from a vertical original)
 *   hero-poster.jpg                  one frame, the fallback image
 *   manifest.json                    what the site reads (no manifest: the hero stays as it is)
 * and reports each size against the budget (computer ≤ 8 MB, phone ≤ 3 MB).
 *
 *   pnpm --filter @jungle/web video:hero [--poster-at 2.5] [--max-seconds 30] [--input file] [--illustrative]
 *
 * --illustrative: the video shows renders or generated images, not real footage (Q44): the site
 * labels it "Video ilustrativ". HERO_VIDEO_OUT and --base write elsewhere (the tests' clip).
 *
 * Needs ffmpeg and ffprobe (apt-get install ffmpeg). Exits with an error, writing nothing, when the
 * original cannot be read; warns (and continues) when it is short, long, small or has sound.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SOURCE_DIR = join(ROOT, "media-src/hero");
const OUT = process.env.HERO_VIDEO_OUT ?? join(ROOT, "public/media/hero");
const BUDGET = { desktop: 8 * 1024 * 1024, mobile: 3 * 1024 * 1024 };
const VIDEO = /\.(mp4|mov|m4v|mkv|webm|avi)$/i;

function option(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function run(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function probe(file) {
  const info = JSON.parse(run("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", file]));
  const video = info.streams.find((s) => s.codec_type === "video");
  if (!video) throw new Error(`no video stream in ${file}`);
  return {
    duration: Number(info.format.duration),
    width: Number(video.width),
    height: Number(video.height),
    sound: info.streams.some((s) => s.codec_type === "audio"),
  };
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

function main() {
  const input =
    option("input", null) ??
    (existsSync(SOURCE_DIR) ? readdirSync(SOURCE_DIR).filter((f) => VIDEO.test(f)).sort().map((f) => join(SOURCE_DIR, f))[0] : undefined);
  if (!input) {
    console.error(`No original video: put it in ${SOURCE_DIR} (mp4, mov, mkv or webm).`);
    process.exit(2);
  }
  const src = probe(input);
  const maxSeconds = Number(option("max-seconds", "30"));
  const vertical = src.height > src.width;
  console.log(`original: ${input}`);
  console.log(`  ${src.width}×${src.height}, ${src.duration.toFixed(1)} s, ${src.sound ? "with sound (removed)" : "no sound"}`);
  const warnings = [];
  if (src.duration < 15) warnings.push("shorter than 15 s: the loop repeats often");
  if (src.duration > maxSeconds) warnings.push(`longer than ${maxSeconds} s: cut to the first ${maxSeconds} s`);
  if (Math.max(src.width, src.height) < 1920) warnings.push("smaller than 1920 px: it will look soft on large screens");
  const seconds = String(Math.min(src.duration, maxSeconds));

  mkdirSync(OUT, { recursive: true });
  const common = ["-y", "-v", "error", "-i", input, "-t", seconds, "-an", "-pix_fmt", "yuv420p"];
  const variants = [
    { name: "hero-1080", scale: vertical ? "1080:-2" : "1920:-2", target: "desktop", crf264: "26", crf9: "36" },
    { name: "hero-720", scale: vertical ? "720:-2" : "1280:-2", target: "mobile", crf264: "28", crf9: "38" },
  ];
  const files = [];
  // Each file is encoded, then encoded again a little more compressed while it is over budget
  // (at most 4 tries): the quality drops only as much as the budget needs.
  const encode = (v, ext, crf) => {
    const filter = ["-vf", `scale=${v.scale}:flags=lanczos,fps=30`];
    const codec =
      ext === "mp4"
        ? ["-c:v", "libx264", "-preset", "slow", "-crf", String(crf), "-profile:v", "high", "-movflags", "+faststart"]
        : ["-c:v", "libvpx-vp9", "-b:v", "0", "-crf", String(crf), "-row-mt", "1", "-deadline", "good"];
    const file = join(OUT, `${v.name}.${ext}`);
    run("ffmpeg", [...common, ...filter, ...codec, file]);
    return statSync(file).size;
  };
  for (const v of variants) {
    for (const [ext, start] of [
      ["mp4", v.crf264],
      ["webm", v.crf9],
    ]) {
      let crf = Number(start);
      let size = encode(v, ext, crf);
      for (let tries = 1; size > BUDGET[v.target] && tries < 4; tries += 1) {
        crf += 3;
        size = encode(v, ext, crf);
      }
      files.push({ file: `${v.name}.${ext}`, size, target: v.target, ok: size <= BUDGET[v.target], crf });
    }
  }
  const at = Math.min(Number(option("poster-at", "2")), Math.max(0, src.duration - 0.1));
  run("ffmpeg", ["-y", "-v", "error", "-ss", String(at), "-i", input, "-frames:v", "1", "-vf", "scale=1920:-2", "-q:v", "4", join(OUT, "hero-poster.jpg")]);

  const base = option("base", "/media/hero");
  const manifest = {
    version: Date.now(),
    duration: Number(seconds),
    vertical,
    illustrative: process.argv.includes("--illustrative"),
    poster: `${base}/hero-poster.jpg`,
    desktop: { mp4: `${base}/hero-1080.mp4`, webm: `${base}/hero-1080.webm` },
    mobile: { mp4: `${base}/hero-720.mp4`, webm: `${base}/hero-720.webm` },
  };
  writeFileSync(join(OUT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`written to ${OUT}:`);
  for (const f of files) console.log(`  ${f.ok ? "ok  " : "OVER"} ${f.file.padEnd(16)} ${mb(f.size).padStart(8)}  (budget ${mb(BUDGET[f.target])}, ${f.target}, crf ${f.crf})`);
  for (const w of warnings) console.log(`  note: ${w}`);
  if (files.some((f) => !f.ok)) {
    console.log("  Over budget: a shorter cut (--max-seconds 20) or a calmer shot brings it down.");
    process.exitCode = 1;
  }
}

main();
