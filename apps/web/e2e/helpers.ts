import AxeBuilder from "@axe-core/playwright";
import { expect, type BrowserContext, type Page } from "@playwright/test";

/** Stores a "necessary only" cookie choice, so the consent banner does not cover the page under test. */
export async function chooseNecessaryCookies(context: BrowserContext, baseURL: string | undefined) {
  const value = encodeURIComponent(JSON.stringify({ v: 1, stats: false, ts: Date.now() }));
  await context.addCookies([{ name: "jp_consent", value, url: baseURL ?? "http://localhost:3000" }]);
}

/**
 * With the site's effects on (ADR-0023), shows every element that waits to appear and lets the
 * transitions end: axe scrolls to what it checks, and would otherwise measure a text halfway
 * through its fade. The page is checked as a visitor sees it once the element is on screen.
 */
async function settleEffects(page: Page) {
  const effects = await page.evaluate(() => {
    if (!document.documentElement.dataset.motion) return false;
    document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-shown])").forEach((el) => (el.dataset.shown = "true"));
    return true;
  });
  if (!effects) return;
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity),
  );
}

/** No serious or critical WCAG 2.2 AA violation (axe). */
export async function expectAccessible(page: Page) {
  await settleEffects(page);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}
