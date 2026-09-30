/**
 * The site's effects that need a little script (ADR-0023, Phase 3): numbers count up and always end
 * on the server's text, the header's progress bar follows the reading, and the menu marks the
 * section in view. Under reduced motion none of it runs and the numbers are there from the start.
 */
import { expect, test } from "@playwright/test";
import { chooseNecessaryCookies } from "../helpers";

test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

const FIGURES = ["4", "3 m", "4", "20", "28", "3"];

test("ADR-0023: the club's numbers count up and end on their real value", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/ro");
  await expect(page.locator("html")).toHaveAttribute("data-motion", /./);
  const level = await page.locator("html").getAttribute("data-motion");
  test.skip(level !== "on", "counting runs only at full motion");
  const numbers = page.locator("#cifre");
  // Every text the parking figure (28) passes through on its way.
  await page.evaluate(() => {
    const fact = document.querySelectorAll("#cifre .tennis__fact")[4] as HTMLElement;
    const seen: string[] = [];
    (window as unknown as { seen: string[] }).seen = seen;
    new MutationObserver(() => seen.push(fact.textContent ?? "")).observe(fact, { childList: true, characterData: true, subtree: true });
  });
  await numbers.scrollIntoViewIfNeeded();
  await expect(numbers.locator(".tennis__fact")).toHaveText(FIGURES, {
    timeout: 5000,
  });
  // The text is "28" before counting starts too: wait for the counting to run and end on it.
  const seen = () => page.evaluate(() => (window as unknown as { seen: string[] }).seen);
  await expect.poll(async () => (await seen()).some((text) => Number(text) < 28)).toBe(true);
  await expect.poll(async () => (await seen()).at(-1)).toBe("28");
  await expect(numbers.locator(".tennis__fact")).toHaveText(FIGURES);
  // After counting nothing is left behind for assistive technology.
  await expect(numbers.locator(".tennis__fact[aria-label]")).toHaveCount(0);
});

test("ADR-0023: the header's progress bar and the section in view", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/ro");
  await expect(page.locator("html")).toHaveAttribute("data-motion", /./);
  test.skip((await page.locator("html").getAttribute("data-motion")) !== "on", "full motion only");
  const bar = page.locator(".site-header__progress");
  await expect(bar).toHaveCount(1);
  await expect(bar).toHaveAttribute("aria-hidden", "true");
  const progress = () => bar.evaluate((el) => Number((el as HTMLElement).style.getPropertyValue("--progress")));
  expect(await progress()).toBeLessThan(0.05);
  await page.locator("#liga").scrollIntoViewIfNeeded();
  await page.evaluate(() => document.getElementById("liga")?.scrollIntoView({ block: "center" }));
  await expect.poll(progress).toBeGreaterThan(0.1);
  if (info.project.name === "desktop") {
    const menu = page.getByRole("navigation", { name: "Meniul principal" }).first();
    await expect(menu.getByRole("link", { name: "Liga", exact: true })).toHaveAttribute("data-active", "true");
    await expect(menu.locator("a[data-active]")).toHaveCount(1);
  }
});

test("ADR-0023: reduced motion, no counting and no progress bar", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ro");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  await expect(page.locator(".site-header__progress")).toHaveCount(0);
  await expect(page.locator("#cifre .tennis__fact")).toHaveText(FIGURES);
});
