import AxeBuilder from "@axe-core/playwright";
import { expect, type BrowserContext, type Page } from "@playwright/test";

/** Stores a "necessary only" cookie choice, so the consent banner does not cover the page under test. */
export async function chooseNecessaryCookies(context: BrowserContext, baseURL: string | undefined) {
  const value = encodeURIComponent(JSON.stringify({ v: 1, stats: false, ts: Date.now() }));
  await context.addCookies([{ name: "jp_consent", value, url: baseURL ?? "http://localhost:3000" }]);
}

/** No serious or critical WCAG 2.2 AA violation (axe). */
export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}
