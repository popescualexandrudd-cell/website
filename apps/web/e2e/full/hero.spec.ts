/**
 * The full site, section 2 (§9.2.2, Stage 11): the cinematic hero "Intră în junglă". Runs after the
 * owner's switch is turned on from the server (`full_site`, Q57).
 */
import { expect, type Page, test } from "@playwright/test";
import { chooseNecessaryCookies, expectAccessible } from "../helpers";

async function shot(page: Page, name: string, project: string) {
  const dir = process.env.E2E_SCREENSHOTS;
  if (dir) await page.screenshot({ path: `${dir}/${project}-${name}.png` });
}

test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

test("§9.2.2: the hero: the title, the render marked as illustrative, the two actions", async ({ page }, info) => {
  await page.goto("/ro");
  const hero = page.getByRole("region", { name: "Intră în junglă." });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Intră în junglă.");
  await expect(hero.getByText("Pantelimon · Deschidere în martie 2027")).toBeVisible();
  await expect(hero.getByRole("img", { name: /^Randare 3D, seara/ })).toBeVisible();
  await expect(hero.getByText(/Randare 3D ilustrativă/)).toBeVisible();
  await expectAccessible(page);
  await shot(page, "03-hero", info.project.name);
  await hero.getByRole("link", { name: "Rezervă un teren" }).click();
  await expect(page).toHaveURL(/\/ro\/rezervari$/);
  await page.goBack();
  await page.getByRole("region", { name: "Intră în junglă." }).getByRole("link", { name: "Vezi liga live" }).click();
  await expect(page).toHaveURL(/\/ro\/liga$/);
});

test("in English; the cue leads down to the next section", async ({ page }) => {
  await page.goto("/en");
  const hero = page.getByRole("region", { name: "Step into the jungle." });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Step into the jungle.");
  await expect(hero.getByRole("link", { name: "Book a court" })).toHaveAttribute("href", "/en/bookings");
  await expect(hero.getByRole("link", { name: "See the league live" })).toHaveAttribute("href", "/en/league");
  await hero.getByRole("link", { name: "Discover the club" }).click();
  await expect(page).toHaveURL(/#sectiuni$/);
  await expect(page.getByRole("heading", { level: 2, name: "The Jungle Padel website, section by section" })).toBeInViewport();
});

test("reduced motion: nothing keeps moving (WCAG 2.3.3)", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ro");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length))
    .toBe(0);
});
