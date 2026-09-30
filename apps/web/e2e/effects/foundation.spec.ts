/**
 * The site's effects, the foundation (ADR-0023). With `web_effects` on, the effects runtime sets the
 * motion level and reveals `[data-reveal]` elements as they come into view; a focused element shows
 * at once; under "reduced motion" and without JavaScript nothing is ever hidden.
 */
import { expect, type Page, test } from "@playwright/test";
import { chooseNecessaryCookies } from "../helpers";

test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

/** A revealed box far down the page, with a link inside, as a section would carry; added once the
 * page is hydrated and the effects runtime runs (React would drop a node added before). */
async function addBox(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("data-motion", /./);
  await page.evaluate(() => {
    const box = document.createElement("div");
    box.id = "fx-box";
    box.dataset.reveal = "rise";
    box.style.marginTop = "300vh";
    box.innerHTML = '<a id="fx-link" href="#fx-box">x</a>';
    document.querySelector("main")?.append(box);
  });
}

const opacity = (page: Page, selector: string) => page.locator(selector).evaluate((el) => Number(getComputedStyle(el).opacity));

test("ADR-0023: an element appears when it comes into view", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/ro");
  await expect(page.locator("html")).toHaveAttribute("data-motion", /^(on|lite)$/);
  await addBox(page);
  await expect(page.locator("#fx-box")).not.toHaveAttribute("data-shown");
  expect(await opacity(page, "#fx-box")).toBe(0);
  await page.locator("#fx-box").scrollIntoViewIfNeeded();
  await expect(page.locator("#fx-box")).toHaveAttribute("data-shown", "true");
  await expect.poll(() => opacity(page, "#fx-box")).toBe(1);
});

test("ADR-0023: a focused element shows at once (keyboard, WCAG 2.4.7)", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/ro");
  await addBox(page);
  await page.locator("#fx-link").focus();
  await expect(page.locator("#fx-box")).toHaveAttribute("data-shown", "true");
});

test("ADR-0023: reduced motion hides nothing (WCAG 2.3.3)", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ro");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  await addBox(page);
  expect(await opacity(page, "#fx-box")).toBe(1);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("ADR-0023: everything is visible, nothing waits for a script", async ({ page }) => {
    await page.goto("/ro");
    await expect(page.locator("html")).not.toHaveAttribute("data-motion");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
