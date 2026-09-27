#!/usr/bin/env node
/**
 * Renders the static fallbacks of the 3D scenes into public/renders/ (our own renders, no stock images).
 * Needs the site running (`pnpm build && pnpm start`); the scenes expose a capture hook with `?3d=capture`.
 *   node scripts/render-stills.mjs [baseUrl]
 */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const base = process.argv[2] ?? "http://localhost:3000";
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "renders");
mkdirSync(out, { recursive: true });
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;
const browser = await chromium.launch({ executablePath, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

function save(name, dataUrl) {
  const buffer = Buffer.from(dataUrl.split(",")[1], "base64");
  writeFileSync(join(out, name), buffer);
  console.log(`${name}: ${(buffer.length / 1024).toFixed(0)} KB`);
}

async function page(width, height) {
  const p = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
  await p.goto(`${base}/ro?3d=capture`, { waitUntil: "load" });
  return p;
}

for (const [name, width, height] of [
  ["arena-wide.webp", 1920, 1080],
  ["arena-tall.webp", 450, 980], // rendered at 2× for phones
]) {
  const p = await page(width, height);
  await p.locator(".hero-visual .scene[data-ready=true] canvas").waitFor({ timeout: 60_000 });
  save(name, await p.evaluate(() => window.__jpCapture.arena()));
  await p.close();
}

const p = await page(1440, 1000);
await p.locator("#liga").scrollIntoViewIfNeeded();
await p.locator("#liga .scene[data-ready=true] canvas").waitFor({ timeout: 60_000 });
for (const tier of ["silver", "gold", "platinum", "diamond"]) {
  save(`card-${tier}.webp`, await p.evaluate((t) => window.__jpCapture.card(t), tier));
}
await browser.close();
