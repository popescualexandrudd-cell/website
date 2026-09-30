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

test("ADR-0023: a new value from the server enters with a pop; the value itself is the server's", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/ro");
  await expect(page.locator("html")).toHaveAttribute("data-motion", /./);
  test.skip((await page.locator("html").getAttribute("data-motion")) !== "on", "full motion only");
  const simulator = page.getByRole("region", { name: "Simulatorul „Împarte ora”" });
  await simulator.scrollIntoViewIfNeeded();
  const total = simulator.locator(".configurator__total");
  await expect(total).toHaveClass(/fx-pop/);
  const before = await total.textContent();
  await total.evaluate((el) => ((el as HTMLElement & { old?: boolean }).old = true));
  await simulator.getByRole("group", { name: "Câți plătiți" }).getByRole("button", { name: "2 jucători", exact: true }).click();
  await expect(total).not.toHaveText(before ?? "");
  // A new element (the price entered again), with the pop animation.
  expect(await total.evaluate((el) => Boolean((el as HTMLElement & { old?: boolean }).old))).toBe(false);
  expect(await total.evaluate((el) => getComputedStyle(el).animationName)).toBe("fx-pop");
});

test("ADR-0023: sections 1-13 reveal their content as it comes into view", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/ro");
  await expect(page.locator("html")).toHaveAttribute("data-motion", /^(on|lite)$/);
  const cards = page.locator("#padel .padel__card");
  await expect(cards.first()).not.toHaveAttribute("data-shown");
  await page.locator("#padel .padel__cards").first().scrollIntoViewIfNeeded();
  await expect(cards.first()).toHaveAttribute("data-shown", "true");
  await expect.poll(() => cards.first().evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1);
  // Every section title waits for its turn, and none stays hidden once reached.
  for (const id of ["tur", "acum", "padel", "nivel", "liga", "tenis", "pilates", "pachete", "imparte-ora", "evenimente", "cafenea"]) {
    const title = page.locator(`#${id} h2`);
    await title.scrollIntoViewIfNeeded();
    await expect(title).toHaveAttribute("data-shown", "true");
  }
});

test("ADR-0023, phase 5: the other pages enter discreetly, and what is on screen at load is never hidden", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/ro/termeni-si-conditii");
  await expect(page.locator("html")).toHaveAttribute("data-motion", /^(on|lite)$/);
  // On screen at load: shown at once, before the effects start (no second paint of the page).
  await expect(page.locator("article.panel")).toHaveAttribute("data-shown", "true");
  expect(await page.locator("article.panel").evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1);
  // A page reached from the menu enters with a rise, then stays.
  await page.goto("/ro");
  await expect(page.locator("html")).toHaveAttribute("data-motion", /./);
  if (info.project.name === "mobile") await page.getByRole("button", { name: "Meniu" }).click();
  await page.getByRole("link", { name: "Pilates", exact: true }).first().click();
  await expect(page).toHaveURL(/\/ro\/pilates$/);
  const title = page.locator(".page-intro h1");
  await expect(title).toHaveAttribute("data-shown", "true");
  await expect.poll(() => title.evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1);
});
