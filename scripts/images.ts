/**
 * `npm run images`: renders the icons (apple-icon, 512 px icon, email ornament) from
 * app/icon.svg. The output is not committed; `npm run dev`, `npm run build` and the Docker
 * build create it when missing.
 *   npm run images -- --if-missing   does nothing when the icons already exist
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const root = process.cwd();

const ICONS = [
  { path: join(root, "app", "apple-icon.png"), size: 180, crop: false },
  { path: join(root, "public", "icon-512.png"), size: 512, crop: false },
  { path: join(root, "public", "email", "minge.png"), size: 64, crop: true },
];

/** The clay tile with the ball for app icons; only the ball for the email ornament. */
async function renderIcons(): Promise<void> {
  const svg = readFileSync(join(root, "app", "icon.svg"), "utf8");
  for (const icon of ICONS) {
    const source = icon.crop
      ? svg.replace('viewBox="0 0 64 64"', 'viewBox="14 10 36 36"').replace(/<rect[^>]*\/>/, "")
      : svg;
    const image = sharp(Buffer.from(source), {
      density: Math.ceil((icon.size / 64) * 72 * 2),
    }).resize(icon.size, icon.size);
    mkdirSync(join(icon.path, ".."), { recursive: true });
    await image.png({ compressionLevel: 9 }).toFile(icon.path);
  }
}

async function main(): Promise<void> {
  if (process.argv.includes("--if-missing") && ICONS.every((icon) => existsSync(icon.path))) return;
  await renderIcons();
  console.info("Gata: pictogramele au fost generate din app/icon.svg.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
