import { createWriteStream } from "node:fs";
import { rm } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { after } from "next/server";
import { adminFromRequest } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { isSameOrigin } from "@/lib/request";
import {
  MAX_VIDEO_BYTES,
  ensureIncomingDir,
  ffmpegAvailable,
  incomingFile,
  newMediaPath,
  processVideo,
} from "@/lib/video";

export const dynamic = "force-dynamic";
/** Converting a long clip can take a few minutes after the response has been sent. */
export const maxDuration = 900;

const TOO_LARGE = "Video-ul depășește 500 MB. Folosește un clip mai scurt sau exportă-l la 1080p.";

function reply(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function header(request: Request, name: string, max: number): string {
  const raw = request.headers.get(name) ?? "";
  try {
    return decodeURIComponent(raw).trim().slice(0, max);
  } catch {
    return "";
  }
}

/**
 * Video upload from the admin. The file is the raw request body (not a form), streamed to disk
 * so a large clip never sits in memory; the name and the description come in headers
 * (URI-encoded). The response returns at once; the conversion runs right after it.
 */
export async function POST(request: Request) {
  const session = await adminFromRequest();
  if (!session) return reply(401, { error: "Sesiunea a expirat. Autentifică-te din nou." });
  if (!isSameOrigin(request))
    return reply(403, { error: "Cererea nu vine din panoul de administrare." });

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_VIDEO_BYTES) return reply(413, { error: TOO_LARGE });
  const type = (request.headers.get("content-type") ?? "").toLowerCase();
  if (!type.startsWith("video/") && type !== "application/octet-stream")
    return reply(415, {
      error: "Fișierul nu este un video. Folosește MP4, MOV, WebM sau alt format video.",
    });
  const altRo = header(request, "x-alt-ro", 300);
  const altEn = header(request, "x-alt-en", 300);
  const originalName = header(request, "x-file-name", 200);
  if (altRo.length < 3)
    return reply(400, {
      error: "Descrie în câteva cuvinte ce se vede în video (textul alternativ e obligatoriu).",
    });
  if (!request.body) return reply(400, { error: "Alege un video." });
  if (!(await ffmpegAvailable()))
    return reply(503, {
      error:
        "Serverul nu are ffmpeg, programul care convertește video-urile. Instalează-l (vezi FFMPEG_PATH în .env.example) și încearcă din nou.",
    });

  const path = newMediaPath();
  const file = incomingFile(path);
  await ensureIncomingDir();
  let received = 0;
  const limit = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      received += chunk.length;
      if (received > MAX_VIDEO_BYTES) callback(new RangeError("too large"));
      else callback(null, chunk);
    },
  });
  try {
    await pipeline(
      Readable.fromWeb(request.body as unknown as NodeReadableStream<Uint8Array>),
      limit,
      createWriteStream(file),
    );
  } catch (error) {
    await rm(file, { force: true });
    if (error instanceof RangeError) return reply(413, { error: TOO_LARGE });
    return reply(400, {
      error: "Încărcarea s-a întrerupt. Verifică conexiunea și încearcă din nou.",
    });
  }
  if (received === 0) {
    await rm(file, { force: true });
    return reply(400, { error: "Fișierul este gol." });
  }

  const media = await db.media.create({
    data: {
      path,
      kind: "VIDEO",
      status: "IN_PROCESARE",
      mimeType: type.startsWith("video/") ? type.slice(0, 60) : "video/*",
      width: 0,
      height: 0,
      blurDataURL: "",
      alt: altEn ? { ro: altRo, en: altEn } : { ro: altRo },
      size: received,
      variants: [],
      originalName: originalName || null,
    },
  });
  await audit(session.user.id, "media.incarcare-video", "Media", media.id, {
    name: originalName,
    size: received,
  });
  after(async () => {
    await processVideo(media.id);
  });
  return reply(201, { id: media.id, status: "IN_PROCESARE" });
}
