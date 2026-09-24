import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp, { type Sharp } from "sharp";

export type ImageVariant = { w: number; avif: string; webp: string };
export type EncodedImage = {
  width: number;
  height: number;
  blurDataURL: string;
  variants: ImageVariant[];
  hasAlpha: boolean;
};

/** Pixel limit guards against decompression bombs (≈ 50 megapixels). */
const LIMIT_INPUT_PIXELS = 50_000_000;

export function openImage(input: Buffer | string, options: { density?: number } = {}): Sharp {
  return sharp(input, {
    limitInputPixels: LIMIT_INPUT_PIXELS,
    density: options.density,
    failOn: "error",
  }).rotate();
}

/**
 * Warm grade + fine grain, so real photos sit well next to the paintings.
 * Applied to files in art-src/foto/ and, optionally, to photos uploaded in the admin.
 */
export async function applyPhotoTreatment(input: Buffer): Promise<Buffer> {
  const image = openImage(input);
  const { width = 1600, height = 1200 } = await image.metadata();
  const graded = await image
    .modulate({ saturation: 0.88, brightness: 1.01 })
    .recomb([
      [1.06, 0.03, 0],
      [0.02, 1.0, 0.0],
      [0, 0.02, 0.9],
    ])
    .gamma(1.04)
    .toBuffer();
  const noise = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
      noise: { type: "gaussian", mean: 128, sigma: 18 },
    },
  })
    .png()
    .toBuffer();
  return sharp(graded)
    .composite([{ input: noise, blend: "soft-light" }])
    .toBuffer();
}

function shortHash(buffer: Buffer): string {
  return createHash("sha1").update(buffer).digest("hex").slice(0, 10);
}

/**
 * Encodes one source into AVIF + WebP at the given widths (never upscaling), plus a tiny
 * blurred WebP as a data URL. Metadata (EXIF, GPS) is dropped because sharp does not keep it
 * unless asked. File names carry a content hash, so they can be cached forever.
 */
export async function encodeVariants(options: {
  input: Buffer | string;
  widths: number[];
  outDir: string;
  baseName: string;
  publicPrefix: string;
  density?: number;
  hashNames?: boolean;
}): Promise<EncodedImage> {
  const { input, widths, outDir, baseName, publicPrefix } = options;
  const hashNames = options.hashNames ?? true;
  await mkdir(outDir, { recursive: true });

  // Decode once (SVG rasterisation and large JPEG decoding are the slow part), then resize from memory.
  const decoded = await openImage(input, { density: options.density })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: sourceWidth, height: sourceHeight, channels } = decoded.info;
  if (!sourceWidth || !sourceHeight) throw new Error("Imaginea nu are dimensiuni valide.");
  const hasAlpha = channels === 4;
  const fromMemory = () =>
    sharp(decoded.data, { raw: { width: sourceWidth, height: sourceHeight, channels } });

  const targetWidths = [...new Set(widths.map((w) => Math.min(w, sourceWidth)))].sort(
    (a, b) => a - b,
  );
  const variants: ImageVariant[] = [];
  for (const width of targetWidths) {
    const resized = await fromMemory()
      .resize({ width, withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const scaled = () => sharp(resized.data, { raw: resized.info });
    const [avif, webp] = await Promise.all([
      scaled()
        .avif({ quality: hasAlpha ? 60 : 52, effort: 3 })
        .toBuffer(),
      scaled().webp({ quality: 78, alphaQuality: 90, effort: 4 }).toBuffer(),
    ]);
    const avifName = hashNames
      ? `${baseName}-${width}.${shortHash(avif)}.avif`
      : `${baseName}-${width}.avif`;
    const webpName = hashNames
      ? `${baseName}-${width}.${shortHash(webp)}.webp`
      : `${baseName}-${width}.webp`;
    await Promise.all([
      writeFile(join(outDir, avifName), avif),
      writeFile(join(outDir, webpName), webp),
    ]);
    variants.push({
      w: width,
      avif: `${publicPrefix}/${avifName}`,
      webp: `${publicPrefix}/${webpName}`,
    });
  }

  const tiny = await fromMemory().resize({ width: 24 }).blur(1.2).webp({ quality: 40 }).toBuffer();

  return {
    width: sourceWidth,
    height: sourceHeight,
    blurDataURL: `data:image/webp;base64,${tiny.toString("base64")}`,
    variants,
    hasAlpha,
  };
}
