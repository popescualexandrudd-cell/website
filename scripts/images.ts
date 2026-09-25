/**
 * `npm run images`: renders the site icons (favicon, apple-icon, 512 px icon) from the club's
 * logo (config/assets/elite-logo.webp) and the email ornament from art-src/icon.svg. The
 * output is not committed; `npm run dev`, `npm run build` and the Docker build create it when
 * missing.
 *   npm run images -- --if-missing   does nothing when the icons already exist
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const root = process.cwd();

const LOGO = join(root, "config", "assets", "elite-logo.webp");
const ORNAMENT_SVG = join(root, "art-src", "icon.svg");

/** From the logo: `background` fills the corners (iOS shows no transparency). */
const LOGO_ICONS = [
  { path: join(root, "app", "icon.png"), size: 96, background: null },
  { path: join(root, "app", "apple-icon.png"), size: 180, background: "#ffffff" },
  { path: join(root, "public", "icon-512.png"), size: 512, background: null },
];
const ORNAMENT = join(root, "public", "email", "minge.png");
const ALL = [...LOGO_ICONS.map((icon) => icon.path), ORNAMENT];

async function renderIcons(): Promise<void> {
  for (const icon of LOGO_ICONS) {
    let image = sharp(LOGO).resize(icon.size, icon.size);
    if (icon.background) image = image.flatten({ background: icon.background });
    mkdirSync(join(icon.path, ".."), { recursive: true });
    await image.png({ compressionLevel: 9 }).toFile(icon.path);
  }
  // Only the ball of the drawn icon, for the emails.
  const svg = readFileSync(ORNAMENT_SVG, "utf8")
    .replace('viewBox="0 0 64 64"', 'viewBox="14 10 36 36"')
    .replace(/<rect[^>]*\/>/, "");
  mkdirSync(join(ORNAMENT, ".."), { recursive: true });
  await sharp(Buffer.from(svg), { density: 144 })
    .resize(64, 64)
    .png({ compressionLevel: 9 })
    .toFile(ORNAMENT);
}

async function main(): Promise<void> {
  if (process.argv.includes("--if-missing") && ALL.every((path) => existsSync(path))) return;
  await renderIcons();
  console.info("Gata: pictogramele au fost generate din logoul clubului.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
