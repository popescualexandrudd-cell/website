/**
 * The hero's presentation video (ADR-0023, Phase 2), with a generated test clip
 * (public/media/hero-e2e, `HERO_VIDEO_MANIFEST`) and the `web_hero_video` switch on. The render
 * stays the first image; the video comes after the page, fades in once playing, pauses with its
 * button (WCAG 2.2.2) and fades out as the hero scrolls away. With reduced motion it never starts
 * on its own: the render stays, with a play button.
 */
import { expect, type Page, test } from "@playwright/test";
import { chooseNecessaryCookies, expectAccessible } from "../helpers";

test.skip(!process.env.E2E_HERO_VIDEO, "no test clip (ffmpeg missing): scripts/test-e2e makes one");
test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

const layer = (page: Page) => page.locator(".hero-video");
const opacity = (page: Page) => layer(page).evaluate((el) => Number(getComputedStyle(el).opacity));

test("ADR-0023: the video comes after the render, plays, pauses and resumes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/ro");
  // The render is the first image, painted before any video.
  await expect(page.locator(".hero-visual img")).toBeVisible();
  await expect(layer(page)).toHaveAttribute("data-shown", "true", { timeout: 20_000 });
  await expect.poll(() => opacity(page)).toBeGreaterThan(0.9);
  const video = page.locator(".hero-video video");
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused && v.currentTime > 0)).toBe(true);
  // Sound is never on.
  expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);

  const toggle = page.getByRole("button", { name: "Oprește videoul" });
  await toggle.click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await page.getByRole("button", { name: "Pornește videoul" }).click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
  await expectAccessible(page);

  // Scrolling away fades it out and reveals the render (and the 3D hall) underneath; back up, back.
  await page.evaluate(() => window.scrollTo(0, window.innerHeight));
  await expect.poll(() => opacity(page)).toBeLessThan(0.1);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => opacity(page)).toBeGreaterThan(0.9);
});

test("ADR-0023: with reduced motion the render stays, with a play button", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ro");
  const play = page.getByRole("button", { name: "Pornește videoul" });
  await expect(play).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(layer(page)).not.toHaveAttribute("data-shown");
  expect(await page.locator(".hero-video video").evaluate((v: HTMLVideoElement) => v.currentSrc)).toBe("");
  await play.click();
  await expect(layer(page)).toHaveAttribute("data-shown", "true", { timeout: 20_000 });
});

test("in English", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  await expect(page.getByRole("button", { name: "Play the video" })).toBeVisible();
});
