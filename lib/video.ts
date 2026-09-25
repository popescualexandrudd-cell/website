/**
 * Videos uploaded from the admin: the original is stored as it came, then converted in the
 * background (by the web server right after the upload, and by the worker if that was
 * interrupted) into H.264 MP4 files a browser can play everywhere, plus a poster frame.
 *
 * The conversion drops every piece of metadata (a phone's video carries the GPS position) and
 * the original is deleted afterwards, so only the converted files are ever served.
 */
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { db } from "./db";
import { getEnv } from "./env";
import { encodeVariants } from "./images/process";
import { roCount } from "./format";
import type { Prisma } from "./generated/prisma/client";

export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
/** Clips for a website: the opening video loops 10–20 s, gallery videos rarely need more. */
export const MAX_VIDEO_SECONDS = 180;
/** Where originals wait for conversion; neither the app nor Caddy serves dot-directories. */
const INCOMING = ".originale";
/** A conversion that has not finished in this time is taken over (its process died). */
const STALE_MS = 30 * 60_000;
/** Longest side of each encoding: 720p for phones, 1080p for large screens. */
const SIZES = [1280, 1920];
const POSTER_WIDTHS = [480, 960, 1440, 1920];

export type VideoSourceVariant = { w: number; h: number; src: string };

export class VideoError extends Error {}

function mediaRoot(): string {
  return resolve(getEnv().MEDIA_DIR);
}

function ffmpegPath(): string {
  return getEnv().FFMPEG_PATH ?? "ffmpeg";
}

/** The file an upload is stored in until it is converted. */
export function incomingFile(mediaPath: string): string {
  return join(mediaRoot(), INCOMING, `${mediaPath.replaceAll("/", "-")}.upload`);
}

type RunResult = { code: number | null; stderr: string; stdout: Buffer };

function runFfmpeg(args: string[], timeoutMs: number): Promise<RunResult> {
  return new Promise((resolvePromise, reject) => {
    let child;
    try {
      // A program on the server, not a project file: nothing to trace into the build output.
      child = spawn(
        /* turbopackIgnore: true */ ffmpegPath(),
        ["-hide_banner", "-nostdin", ...args],
        {
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
    } catch (error) {
      reject(error);
      return;
    }
    const out: Buffer[] = [];
    let err = "";
    child.stdout.on("data", (chunk: Buffer) => out.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => {
      // Keep the end of the report: that is where ffmpeg explains a failure.
      err = (err + chunk.toString("utf8")).slice(-64 * 1024);
    });
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolvePromise({ code, stderr: err, stdout: Buffer.concat(out) });
    });
  });
}

/** True when ffmpeg can be started on this server. */
export async function ffmpegAvailable(): Promise<boolean> {
  try {
    return (await runFfmpeg(["-version"], 15_000)).code === 0;
  } catch {
    return false;
  }
}

export type Probe = {
  hasVideo: boolean;
  durationSec: number | null;
  width: number | null;
  height: number | null;
};

/** Reads what matters from ffmpeg's report on an input file. */
export function parseProbe(report: string): Probe {
  const duration = report.match(/Duration:\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/);
  const stream = report.match(/Stream #\d+:\d+[^\n]*?: Video:[^\n]*?(\d{2,5})x(\d{2,5})/);
  return {
    hasVideo: /Stream #\d+:\d+[^\n]*?: Video:/.test(report),
    durationSec: duration
      ? Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3])
      : null,
    width: stream ? Number(stream[1]) : null,
    height: stream ? Number(stream[2]) : null,
  };
}

async function probe(file: string): Promise<Probe> {
  // With no output ffmpeg exits with an error, after printing what it found in the input.
  const result = await runFfmpeg(["-i", file], 60_000);
  return parseProbe(result.stderr);
}

/** The longest sides to encode for a source: never upscaled, 1080p only for large sources. */
export function targetSizes(longSide: number): number[] {
  const sizes = SIZES.filter((size, index) => index === 0 || longSide >= size * 0.9);
  return sizes.map((size) => Math.min(size, longSide - (longSide % 2)));
}

function scaleFilter(longSide: number): string {
  const even = (expr: string) => `trunc(${expr}/2)*2`;
  return [
    `scale=w='if(gte(iw,ih),${even(`min(${longSide},iw)`)},-2)'`,
    `:h='if(gte(iw,ih),-2,${even(`min(${longSide},ih)`)})'`,
    ",format=yuv420p",
  ].join("");
}

async function encode(input: string, output: string, longSide: number): Promise<void> {
  const result = await runFfmpeg(
    [
      "-y",
      "-i",
      input,
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-t",
      String(MAX_VIDEO_SECONDS),
      "-vf",
      scaleFilter(longSide),
      "-fpsmax",
      "30",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "23",
      "-profile:v",
      "high",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ac",
      "2",
      "-map_metadata",
      "-1",
      "-map_chapters",
      "-1",
      "-movflags",
      "+faststart",
      output,
    ],
    20 * 60_000,
  );
  if (result.code !== 0) {
    const reason = result.stderr.trim().split("\n").slice(-3).join(" ").slice(0, 400);
    throw new VideoError(`Conversia video nu a reușit (${reason}).`);
  }
}

async function posterFrame(file: string, atSec: number): Promise<Buffer> {
  const result = await runFfmpeg(
    [
      "-ss",
      atSec.toFixed(2),
      "-i",
      file,
      "-frames:v",
      "1",
      "-f",
      "image2",
      "-c:v",
      "png",
      "pipe:1",
    ],
    120_000,
  );
  if (result.code !== 0 || result.stdout.length === 0)
    throw new VideoError("Nu am putut extrage un cadru din video.");
  return result.stdout;
}

/** Converts one uploaded video; the caller has claimed it. */
async function convert(media: { id: string; path: string }): Promise<void> {
  const input = incomingFile(media.path);
  const info = await probe(input);
  if (!info.hasVideo || !info.width || !info.height)
    throw new VideoError("Fișierul nu conține un video pe care să-l putem citi.");
  if (info.durationSec !== null && info.durationSec > MAX_VIDEO_SECONDS + 1)
    throw new VideoError(
      `Video-ul durează ${roCount(Math.round(info.durationSec / 60), "un minut", "minute")}; pe site folosim clipuri de cel mult ${roCount(MAX_VIDEO_SECONDS / 60, "un minut", "minute")}. Taie-l și încarcă-l din nou.`,
    );

  const [folderYear, folderMonth, base] = media.path.split("/");
  const folder = `${folderYear}/${folderMonth}`;
  const outDir = join(mediaRoot(), folder);
  await mkdir(outDir, { recursive: true });
  const longSide = Math.max(info.width, info.height);
  const variants: VideoSourceVariant[] = [];
  for (const size of targetSizes(longSide)) {
    const name = `${base}-${size}.${randomUUID().slice(0, 8)}.mp4`;
    await encode(input, join(outDir, name), size);
    const landscape = info.width >= info.height;
    const scale = size / longSide;
    const w = landscape ? size : Math.round((info.width * scale) / 2) * 2;
    const h = landscape ? Math.round((info.height * scale) / 2) * 2 : size;
    variants.push({ w, h, src: `/media/${folder}/${name}` });
  }

  // The poster comes from the converted file, so it is upright and the same size.
  const largest = variants.at(-1)!;
  const duration = info.durationSec ?? 0;
  const frame = await posterFrame(
    join(mediaRoot(), largest.src.replace(/^\/media\//, "")),
    Math.min(1, duration / 3),
  );
  const poster = await encodeVariants({
    input: frame,
    widths: POSTER_WIDTHS,
    outDir,
    baseName: `${base}-cadru`,
    publicPrefix: `/media/${folder}`,
  });

  await db.media.update({
    where: { id: media.id },
    data: {
      status: "GATA",
      mimeType: "video/mp4",
      width: poster.width,
      height: poster.height,
      blurDataURL: poster.blurDataURL,
      variants: variants as unknown as Prisma.InputJsonValue,
      poster: poster.variants as unknown as Prisma.InputJsonValue,
      durationSec: info.durationSec,
      error: null,
      processingAt: null,
    },
  });
}

/** Converts a video if no other process is already converting it. Returns true if it ran. */
export async function processVideo(id: string, now = new Date()): Promise<boolean> {
  const claimed = await db.media.updateMany({
    where: {
      id,
      kind: "VIDEO",
      status: "IN_PROCESARE",
      OR: [{ processingAt: null }, { processingAt: { lt: new Date(now.getTime() - STALE_MS) } }],
    },
    data: { processingAt: now },
  });
  if (claimed.count === 0) return false;
  const media = await db.media.findUniqueOrThrow({ where: { id } });
  try {
    await convert(media);
  } catch (error) {
    const missing = (error as NodeJS.ErrnoException)?.code === "ENOENT";
    const message = missing
      ? "Serverul nu are ffmpeg, programul care convertește video-urile. Vezi FFMPEG_PATH în .env.example."
      : error instanceof VideoError
        ? error.message
        : "Conversia video nu a reușit.";
    if (!(error instanceof VideoError) && !missing) console.error("[video]", id, error);
    await db.media.update({
      where: { id },
      data: { status: "EROARE", error: message, processingAt: null },
    });
  } finally {
    await rm(incomingFile(media.path), { force: true });
  }
  return true;
}

/** Every video still waiting (after a restart, or a missed conversion). */
export async function processPendingVideos(now = new Date()): Promise<number> {
  const pending = await db.media.findMany({
    where: {
      kind: "VIDEO",
      status: "IN_PROCESARE",
      OR: [{ processingAt: null }, { processingAt: { lt: new Date(now.getTime() - STALE_MS) } }],
    },
    select: { id: true, path: true },
    orderBy: { createdAt: "asc" },
    take: 5,
  });
  let done = 0;
  for (const media of pending) {
    // The row is created only once the upload is complete, so a missing file is a lost one.
    const exists = await stat(incomingFile(media.path)).catch(() => null);
    if (!exists) {
      await db.media.updateMany({
        where: { id: media.id, status: "IN_PROCESARE" },
        data: {
          status: "EROARE",
          error: "Fișierul încărcat s-a pierdut. Încarcă video-ul din nou.",
        },
      });
      continue;
    }
    if (await processVideo(media.id, now)) done += 1;
  }
  return done;
}

/** A new folder/name for an upload, like images: "2026/09/3f2a9c1b7d4e". */
export function newMediaPath(now = new Date()): string {
  const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return `${folder}/${randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

export async function ensureIncomingDir(): Promise<void> {
  await mkdir(join(mediaRoot(), INCOMING), { recursive: true });
}
