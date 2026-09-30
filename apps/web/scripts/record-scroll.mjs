/**
 * Records a slow scroll through a page of the running site, as a video for the owner's reports
 * (ADR-0023): the effects as a visitor sees them, top to bottom. Nothing is changed on the page.
 *
 *   node scripts/record-scroll.mjs OUT_DIR [path, /ro] [base URL, http://localhost:3000]
 *
 * Writes OUT_DIR/desktop.webm and OUT_DIR/mobile.webm (Playwright's recorder, VP8).
 */
import { mkdir, readdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { chromium, devices } from "@playwright/test";

const [out, path = "/ro", base = "http://localhost:3000"] = process.argv.slice(2);
if (!out) {
  console.error("usage: record-scroll.mjs OUT_DIR [path] [base URL]");
  process.exit(2);
}
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
const consent = encodeURIComponent(JSON.stringify({ v: 1, stats: false, ts: Date.now() }));

for (const [name, options] of [
  ["desktop", { viewport: { width: 1280, height: 800 } }],
  ["mobile", { ...devices["Pixel 7"] }],
]) {
  const tmp = join(out, `.${name}`);
  const size = options.viewport ?? { width: 1280, height: 800 };
  const context = await browser.newContext({ ...options, reducedMotion: "no-preference", recordVideo: { dir: tmp, size } });
  await context.addCookies([{ name: "jp_consent", value: consent, url: base }]);
  const page = await context.newPage();
  await page.goto(base + path, { waitUntil: "load" });
  await page.waitForTimeout(2500);
  const height = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  // About 700 px a second: slow enough to see every section appear.
  for (let y = 0; y < height; y += 35) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(1500);
  await context.close();
  const [file] = await readdir(tmp);
  await rename(join(tmp, file), join(out, `${name}.webm`));
  await rm(tmp, { recursive: true, force: true });
  console.log(`${name}: ${join(out, `${name}.webm`)}`);
}
await browser.close();
