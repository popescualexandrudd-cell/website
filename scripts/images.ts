/**
 * `npm run images`: turns the originals in art-src/ into responsive AVIF + WebP files and
 * blur placeholders in public/art/generated/, and writes public/art/manifest.json.
 *
 * Priority for each image key (e.g. "01-deschiderea"):
 *   1. art-src/<key>.(jpg|jpeg|png|webp|tif|tiff)       the real painting
 *   2. art-src/placeholders/<key>.svg                    the compositional placeholder
 * Mobile crops use "<key>-mobil" with the same rules; if only a real desktop painting exists,
 * the mobile version is a centred 9:16 crop of it.
 * Real photos of the coach go in art-src/foto/ and receive the site's warm grade and grain.
 *
 * To replace an image: drop a file with the same name in art-src/ and run `npm run images`.
 */
import { existsSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import sharp from "sharp";
import { applyPhotoTreatment, encodeVariants, type EncodedImage } from "../lib/images/process";
import { compositions } from "./placeholders/compositions";

const root = process.cwd();
const artSrc = join(root, "art-src");
const placeholderDir = join(artSrc, "placeholders");
const fotoDir = join(artSrc, "foto");
const outDir = join(root, "public", "art", "generated");
const manifestPath = join(root, "public", "art", "manifest.json");
const publicPrefix = "/art/generated";
const RASTER = [".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"];

type Kind = "scene" | "program" | "texture" | "cloud" | "foto";
const WIDTHS: Record<Kind, { desktop: number[]; mobile: number[] }> = {
  scene: { desktop: [960, 1440, 1920, 2560], mobile: [540, 828, 1080] },
  texture: { desktop: [1280, 2560], mobile: [540, 1080] },
  program: { desktop: [480, 800, 1200], mobile: [] },
  cloud: { desktop: [800, 1600], mobile: [] },
  foto: { desktop: [640, 1024, 1600], mobile: [] },
};

type ManifestEntry = { kind: Kind; source: "art" | "placeholder" | "foto"; desktop: EncodedImage; mobile?: EncodedImage };

function findRaster(dir: string, name: string): string | null {
  for (const ext of RASTER) {
    const candidate = join(dir, `${name}${ext}`);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

async function mobileCropFrom(path: string): Promise<Buffer> {
  const image = sharp(path).rotate();
  const { width = 0, height = 0 } = await image.metadata();
  const cropWidth = Math.min(width, Math.round((height * 9) / 16));
  const left = Math.round((width - cropWidth) / 2);
  return image.extract({ left, top: 0, width: cropWidth, height }).toBuffer();
}

async function main(): Promise<void> {
  rmSync(outDir, { recursive: true, force: true });
  const manifest: Record<string, ManifestEntry> = {};
  const extraKeys = existsSync(artSrc)
    ? readdirSync(artSrc)
        .filter((file) => RASTER.includes(extname(file).toLowerCase()))
        .map((file) => basename(file, extname(file)).replace(/-mobil$/, ""))
    : [];
  const keys = [...new Set([...Object.keys(compositions), ...extraKeys])];

  for (const key of keys) {
    const kind: Kind = compositions[key]?.kind ?? "scene";
    const widths = WIDTHS[kind];
    const realDesktop = findRaster(artSrc, key);
    const placeholderDesktop = join(placeholderDir, `${key}.svg`);
    const desktopSource = realDesktop ?? (existsSync(placeholderDesktop) ? placeholderDesktop : null);
    if (!desktopSource) continue;
    const isSvg = desktopSource.endsWith(".svg");

    const desktop = await encodeVariants({
      input: desktopSource,
      widths: widths.desktop,
      outDir,
      baseName: key,
      publicPrefix,
      density: isSvg ? 72 : undefined,
    });

    let mobile: EncodedImage | undefined;
    if (widths.mobile.length > 0) {
      const realMobile = findRaster(artSrc, `${key}-mobil`);
      const placeholderMobile = join(placeholderDir, `${key}-mobil.svg`);
      let mobileInput: Buffer | string | null = realMobile;
      if (!mobileInput && realDesktop) mobileInput = await mobileCropFrom(realDesktop);
      if (!mobileInput && existsSync(placeholderMobile)) mobileInput = placeholderMobile;
      if (mobileInput) {
        mobile = await encodeVariants({
          input: mobileInput,
          widths: widths.mobile,
          outDir,
          baseName: `${key}-mobil`,
          publicPrefix,
          density: typeof mobileInput === "string" && mobileInput.endsWith(".svg") ? 72 : undefined,
        });
      }
    }
    manifest[key] = { kind, source: realDesktop ? "art" : "placeholder", desktop, ...(mobile ? { mobile } : {}) };
    console.info(`  ${realDesktop ? "pictură " : "provizoriu"}  ${key}`);
  }

  if (existsSync(fotoDir)) {
    for (const file of readdirSync(fotoDir)) {
      if (!RASTER.includes(extname(file).toLowerCase())) continue;
      const name = basename(file, extname(file));
      const treated = await applyPhotoTreatment(await sharp(join(fotoDir, file)).toBuffer());
      const desktop = await encodeVariants({
        input: treated,
        widths: WIDTHS.foto.desktop,
        outDir,
        baseName: `foto-${name}`,
        publicPrefix,
      });
      manifest[`foto/${name}`] = { kind: "foto", source: "foto", desktop };
      console.info(`  fotografie ${name}`);
    }
  }

  writeFileSync(manifestPath, `${JSON.stringify({ images: manifest }, null, 1)}\n`);
  console.info(`Gata: ${Object.keys(manifest).length} imagini în public/art/generated/.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
