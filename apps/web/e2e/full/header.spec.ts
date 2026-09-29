/**
 * The full site, section 1 (§9.2.1, Stage 11): the fixed header. Runs after the owner's switch is
 * turned on from the server (`manage.py set_flag full_site on`, Q57), which tells the website to
 * rebuild its pages at once (POST /api/revalidate with the shared secret).
 */
import { expect, type Page, test } from "@playwright/test";
import { chooseNecessaryCookies, expectAccessible } from "../helpers";

const MENU_RO = ["Padel", "Liga", "Tenis", "Pilates", "Pachete", "Evenimente", "Cafenea", "Contact"];

async function shot(page: Page, name: string, project: string) {
  const dir = process.env.E2E_SCREENSHOTS;
  if (dir) await page.screenshot({ path: `${dir}/${project}-${name}.png` });
}

test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

test("§9.2.1: the full site's header on the home page, with the map of the sections", async ({ page }, info) => {
  await page.goto("/ro");
  const header = page.locator("header.site-header--full");
  await expect(header).toBeVisible();
  await expect(header.getByRole("link", { name: "Rezervă" })).toBeVisible(); // always visible, a phone too
  await expect(page.getByRole("heading", { level: 2, name: "Site-ul Jungle Padel, secțiune cu secțiune" })).toBeVisible();
  const map = page.locator(".section-map li");
  await expect(map).toHaveCount(19);
  await expect(map.nth(0)).toHaveAttribute("data-built", "true");
  await expect(map.nth(1)).toHaveAttribute("data-built", "true"); // the hero (section 2)
  await expect(map.nth(2)).toContainText("Urmează");
  if (info.project.name === "desktop") {
    const menu = page.getByRole("navigation", { name: "Meniul principal" }).first();
    await expect(menu.getByRole("link")).toHaveText(MENU_RO);
    await expect(header.getByRole("link", { name: "Contul meu" })).toBeVisible();
  }
  await expectAccessible(page);
  await shot(page, "01-antet", info.project.name);
});

test("a menu page in the language chosen, marked as the current page, and back in English", async ({ page }, info) => {
  await page.goto("/ro");
  if (info.project.name === "mobile") await page.getByRole("button", { name: "Meniu" }).click();
  await page.getByRole("link", { name: "Liga", exact: true }).first().click();
  await expect(page).toHaveURL(/\/ro\/liga$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Liga Jungle");
  await expect(page.getByText(/se construiește în Etapa 11/)).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  if (info.project.name === "desktop") {
    await expect(page.getByRole("link", { name: "Liga", exact: true }).first()).toHaveAttribute("aria-current", "page");
    await page.getByRole("link", { name: "English" }).first().click();
  } else {
    await page.getByRole("button", { name: "Meniu" }).click();
    await page.locator(".menu-panel").getByRole("link", { name: "English" }).click();
  }
  await expect(page).toHaveURL(/\/en\/league$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Jungle League");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expectAccessible(page);
});

test("“Rezervă” and the account lead to their pages", async ({ page }, info) => {
  await page.goto("/ro");
  await page.locator("header").getByRole("link", { name: "Rezervă" }).click();
  await expect(page).toHaveURL(/\/ro\/rezervari$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rezervări");
  if (info.project.name === "mobile") {
    await page.getByRole("button", { name: "Meniu" }).click();
    await page.locator(".menu-panel").getByRole("link", { name: "Contul meu" }).click();
  } else {
    await page.locator("header").getByRole("link", { name: "Contul meu" }).click();
  }
  await expect(page).toHaveURL(/\/ro\/cont$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contul meu");
});

test("every width: nothing wider than the screen, the menu or its button always there (WCAG 1.4.10)", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "widths are set here");
  for (const width of [1440, 1280, 1279, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/ro");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${width}px`).toBeLessThanOrEqual(0);
    await expect(page.locator("header").getByRole("link", { name: "Rezervă" }), `${width}px`).toBeVisible();
    const wide = width >= 1280;
    await expect(page.locator(".full-nav"), `${width}px`).toBeVisible({ visible: wide });
    await expect(page.getByRole("button", { name: "Meniu" }), `${width}px`).toBeVisible({ visible: !wide });
    if (wide) {
      const nav = await page.locator(".full-nav").boundingBox();
      const actions = await page.locator(".header-actions").boundingBox();
      expect((nav?.x ?? 0) + (nav?.width ?? 0), `${width}px: the menu does not run into the buttons`).toBeLessThan(actions?.x ?? 0);
    }
  }
});

test("phone: the menu opens under the header, closes with Escape and gives the focus back", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "the menu button exists below 1280 px");
  await page.goto("/ro");
  const toggle = page.getByRole("button", { name: "Meniu" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  const close = page.getByRole("button", { name: "Închide" });
  await expect(close).toHaveAttribute("aria-expanded", "true");
  const panel = page.locator(".menu-panel");
  await expect(panel.getByRole("link")).toHaveText([...MENU_RO, "RO", "EN", "Contul meu"].map((t) => new RegExp(t)));
  // Language and account below the list, not beside it.
  const list = await panel.locator(".menu-panel__list").boundingBox();
  const extra = await panel.locator(".menu-panel__extra").boundingBox();
  expect(extra?.y ?? 0).toBeGreaterThanOrEqual((list?.y ?? 0) + (list?.height ?? 0));
  await expectAccessible(page);
  await shot(page, "02-meniu-deschis", info.project.name);
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(page.getByRole("button", { name: "Meniu" })).toBeFocused();
  await page.getByRole("button", { name: "Meniu" }).click();
  await panel.getByRole("link", { name: "Cafenea" }).click();
  await expect(page).toHaveURL(/\/ro\/cafenea$/);
  await expect(panel).toBeHidden();
});

test("keyboard: skip link, logo, then the menu in order (WCAG 2.4.3)", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "no physical keyboard on phones");
  await page.goto("/ro");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Jungle Padel — pagina principală" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Padel", exact: true }).first()).toBeFocused();
});

test("the page refresh route refuses a request without the backend's secret", async ({ request }) => {
  const refused = await request.post("/api/revalidate", { data: { tags: ["flags"] } });
  expect(refused.status()).toBe(401);
  const wrong = await request.post("/api/revalidate", { data: { tags: ["flags"] }, headers: { "X-Revalidate-Secret": "guess" } });
  expect(wrong.status()).toBe(401);
});
