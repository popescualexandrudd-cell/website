/**
 * Regenerates the compositional placeholder paintings (SVG) in art-src/placeholders/
 * and copies them to public/art/placeholders/. Run: `npx tsx scripts/placeholders.ts`.
 * They are the source for `npm run images` until the real paintings are added to art-src/.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { compositions } from "./placeholders/compositions";

const root = process.cwd();
const outDirs = [
  join(root, "art-src", "placeholders"),
  join(root, "public", "art", "placeholders"),
];
for (const dir of outDirs) mkdirSync(dir, { recursive: true });

const sizes = {
  scene: { desktop: { w: 2560, h: 1440 }, mobile: { w: 1080, h: 1920 } },
  texture: { desktop: { w: 2560, h: 1440 }, mobile: { w: 1080, h: 1920 } },
  program: { desktop: { w: 1200, h: 1500 } },
  cloud: { desktop: { w: 1600, h: 900 } },
} as const;

let count = 0;
for (const [key, { composition, kind }] of Object.entries(compositions)) {
  const variants = sizes[kind];
  const outputs: [string, string][] = [[`${key}.svg`, composition(variants.desktop, false)]];
  if ("mobile" in variants) outputs.push([`${key}-mobil.svg`, composition(variants.mobile, true)]);
  for (const [file, content] of outputs) {
    for (const dir of outDirs) writeFileSync(join(dir, file), content);
    count += 1;
  }
}
console.info(`Placeholder-e generate: ${count} fișiere SVG.`);
