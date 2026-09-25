import "server-only";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { db } from "../db";
import { getEnv } from "../env";
import { t } from "../i18n-content";
import {
  applyPhotoTreatment,
  encodeVariants,
  openImage,
  type ImageVariant,
} from "../images/process";
import { incomingFile } from "../video";
import type { Prisma } from "../generated/prisma/client";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const WIDTHS = [480, 960, 1440, 1920, 2560];

/** Raster formats accepted from the admin. SVG is refused: it can carry scripts. */
const ACCEPTED = new Set(["jpeg", "png", "webp", "avif", "heif", "tiff"]);

export type MediaThumb = {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  kind: "IMAGINE" | "VIDEO";
  status: "GATA" | "IN_PROCESARE" | "EROARE";
  error: string | null;
  durationSec: number | null;
};

function variantsOf(value: unknown): ImageVariant[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is ImageVariant =>
      typeof v === "object" &&
      v !== null &&
      typeof (v as ImageVariant).w === "number" &&
      typeof (v as ImageVariant).webp === "string",
  );
}

export function thumbUrl(variants: unknown): string {
  const sorted = variantsOf(variants).sort((a, b) => a.w - b.w);
  return sorted[0]?.webp ?? "";
}

export function toThumb(media: {
  id: string;
  variants: unknown;
  alt: unknown;
  width: number;
  height: number;
  kind: "IMAGINE" | "VIDEO";
  status: "GATA" | "IN_PROCESARE" | "EROARE";
  poster: unknown;
  error: string | null;
  durationSec: number | null;
}): MediaThumb {
  return {
    id: media.id,
    // A video is shown by its poster frame (none until it is converted).
    url: thumbUrl(media.kind === "VIDEO" ? media.poster : media.variants),
    alt: t(media.alt, "ro"),
    width: media.width,
    height: media.height,
    kind: media.kind,
    status: media.status,
    error: media.error,
    durationSec: media.durationSec,
  };
}

export function mediaRoot(): string {
  return resolve(getEnv().MEDIA_DIR);
}

/**
 * Resolves a public /media path to a file inside MEDIA_DIR, refusing anything that escapes it
 * and the hidden folders (videos waiting for conversion).
 */
export function mediaFilePath(segments: string[]): string | null {
  if (segments.some((s) => s === "" || s.startsWith(".") || s.includes("\\") || s.includes("\0")))
    return null;
  const root = mediaRoot();
  const full = resolve(root, ...segments);
  return full.startsWith(root + sep) ? full : null;
}

/**
 * Real type check (by decoding, not by extension or the browser's MIME type), size limit,
 * re-encoding to AVIF + WebP (which drops EXIF, including GPS), and an optional warm grade.
 */
export async function processUpload(options: {
  buffer: Buffer;
  originalName: string;
  alt: { ro: string; en?: string };
  treatment: boolean;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { buffer } = options;
  if (buffer.length === 0) return { ok: false, error: "Fișierul este gol." };
  if (buffer.length > MAX_UPLOAD_BYTES)
    return {
      ok: false,
      error: "Fișierul depășește 10 MB. Micșorează fotografia și încearcă din nou.",
    };

  let format: string | undefined;
  try {
    const meta = await openImage(buffer).metadata();
    format = meta.format;
    if (!meta.width || !meta.height) format = undefined;
  } catch {
    format = undefined;
  }
  if (!format || !ACCEPTED.has(format)) {
    return {
      ok: false,
      error: "Fișierul nu este o fotografie acceptată. Folosește JPG, PNG, WebP, AVIF sau HEIC.",
    };
  }

  const source = options.treatment ? await applyPhotoTreatment(buffer) : buffer;
  const now = new Date();
  const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const baseName = randomUUID().slice(0, 12);
  const outDir = join(mediaRoot(), folder);
  let encoded;
  try {
    encoded = await encodeVariants({
      input: source,
      widths: WIDTHS,
      outDir,
      baseName,
      publicPrefix: `/media/${folder}`,
    });
  } catch {
    return {
      ok: false,
      error:
        "Imaginea nu a putut fi procesată. Încearcă altă fotografie sau salveaz-o din nou ca JPG.",
    };
  }

  const media = await db.media.create({
    data: {
      path: `${folder}/${baseName}`,
      mimeType: `image/${format}`,
      width: encoded.width,
      height: encoded.height,
      blurDataURL: encoded.blurDataURL,
      alt: options.alt,
      size: buffer.length,
      variants: encoded.variants as unknown as Prisma.InputJsonValue,
      originalName: options.originalName.slice(0, 200) || null,
    },
  });
  return { ok: true, id: media.id };
}

/** Deletes the files of a media row (the row itself is deleted by the caller). */
export async function removeMediaFiles(media: {
  path: string;
  variants: unknown;
  poster?: unknown;
}): Promise<void> {
  const urls: string[] = [];
  for (const variant of [...variantsOf(media.variants), ...variantsOf(media.poster)])
    urls.push(variant.avif, variant.webp);
  if (Array.isArray(media.variants)) {
    for (const variant of media.variants) {
      const src = (variant as { src?: unknown } | null)?.src;
      if (typeof src === "string") urls.push(src);
    }
  }
  for (const url of urls) {
    const path = mediaFilePath(url.replace(/^\/media\//, "").split("/"));
    if (path) await rm(path, { force: true });
  }
  await rm(incomingFile(media.path), { force: true });
}

/** How many places use a media item (a used image cannot be deleted). */
export async function mediaUsage(id: string): Promise<number> {
  const counts = await Promise.all([
    db.coach.count({ where: { OR: [{ photoId: id }, { videoId: id }] } }),
    db.siteSettings.count({
      where: { OR: [{ logoId: id }, { heroVideoId: id }, { heroImageId: id }] },
    }),
    db.academyGroup.count({ where: { imageId: id } }),
    db.certification.count({ where: { imageId: id } }),
    db.program.count({ where: { imageId: id } }),
    db.facility.count({ where: { imageId: id } }),
    db.testimonial.count({ where: { photoId: id } }),
    db.galleryItem.count({ where: { mediaId: id } }),
    db.post.count({ where: { coverId: id } }),
    db.pageHeader.count({ where: { imageId: id } }),
  ]);
  return counts.reduce((a, b) => a + b, 0);
}
