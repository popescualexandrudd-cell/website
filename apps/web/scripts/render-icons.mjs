#!/usr/bin/env node
/**
 * The app icons of the installable site (PWA), drawn from public/icon.svg: 192 and 512 px, a
 * "maskable" 512 px one (the emblem inside the safe zone, the background to the edges, for Android's
 * round or squircle masks) and the 180 px Apple touch icon. The PNGs are committed.
 *   node scripts/render-icons.mjs
 */
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const svg = readFileSync(join(root, "icon.svg"), "utf8");
const inner = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
// The emblem without its rounded tile, for the maskable icon (a square background of the tile's colour).
const emblem = inner.replace(/<rect[^>]*\/>/, "");
const tile = svg.match(/<rect[^>]*fill="(#[0-9A-Fa-f]{6})"/)?.[1];
if (!tile) throw new Error("icon.svg: no tile colour");

const icons = [
  { file: "icon-192.png", size: 192, markup: svg },
  { file: "icon-512.png", size: 512, markup: svg },
  { file: "apple-touch-icon.png", size: 180, markup: svg },
  {
    file: "maskable-512.png",
    size: 512,
    // Android's masks keep at least the middle circle of 80%: the emblem's ring spans 57.5%.
    markup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="${tile}"/>${emblem}</svg>`,
  },
];

const executablePath = process.env.PW_CHROMIUM_PATH || undefined;
const browser = await chromium.launch({ executablePath });
for (const { file, size, markup } of icons) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${markup.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`,
  );
  const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  writeFileSync(join(root, "icons", file), png);
  console.log(`icons/${file}: ${(png.length / 1024).toFixed(1)} KB`);
  await page.close();
}
await browser.close();
