// Renders the brand mark (public/icon.svg) to the PNG sizes Apple and Google Wallet need.
// Run from apps/web:  node scripts/build-wallet-images.mjs
// Output: apps/backend/jungle/cards/wallet_assets/ (inside the .pkpass) and public/wallet/
// (public URLs for Google Wallet).
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const svg = readFileSync("public/icon.svg", "utf8");
const backend = "../backend/jungle/cards/wallet_assets";
const web = "public/wallet";
mkdirSync(backend, { recursive: true });
mkdirSync(web, { recursive: true });

const targets = [
  [`${backend}/icon.png`, 29],
  [`${backend}/icon@2x.png`, 58],
  [`${backend}/icon@3x.png`, 87],
  [`${backend}/logo.png`, 50],
  [`${backend}/logo@2x.png`, 100],
  [`${backend}/logo@3x.png`, 150],
  [`${web}/logo-660.png`, 660],
];

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
const page = await browser.newPage();
for (const [path, size] of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`,
  );
  await page.locator("svg").screenshot({ path, omitBackground: true });
}
await browser.close();
console.log(`${targets.length} images`);
