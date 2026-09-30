/**
 * The full site, section 8 (§9.2.8, Stage 11): tennis, played at Clubul Tenis Elite, whose site
 * stays separate (Q20). Until the owner sets its address (Q58) there is no link, only the note; no
 * price or court time of the tennis club appears here.
 */
import { expect, type Page, test } from "@playwright/test";
import { chooseNecessaryCookies, expectAccessible } from "../helpers";

async function shot(page: Page, name: string, project: string) {
  const dir = process.env.E2E_SCREENSHOTS;
  if (dir) await page.screenshot({ path: `${dir}/${project}-${name}.png` });
}

test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

test("§9.2.8: the tennis club in facts, lessons, packages and the link to come (Q20, Q58)", async ({ page }, info) => {
  await page.goto("/ro");
  const tennis = page.getByRole("region", { name: "Tenis, la Clubul Tenis Elite." });
  await tennis.scrollIntoViewIfNeeded();
  const facts = tennis.getByRole("list", { name: "Clubul Tenis Elite, pe scurt" }).locator(".tennis__fact");
  await expect(facts).toHaveText(["2013", "8", "4", "Copii și adulți"]);
  await expect(tennis.getByRole("heading", { level: 3 })).toHaveText([
    "Lecții de tenis",
    "Abonamente combinate",
    "Reformer pentru jucători",
  ]);
  await expect(tennis.getByText("Legătura spre site-ul Clubului Tenis Elite apare aici în curând.")).toBeVisible();
  await expect(tennis.locator('a[target="_blank"]')).toHaveCount(0);
  await expect(tennis).not.toContainText(/\d\s?(lei|RON)\b/);
  await expect(tennis.getByRole("link", { name: "Vezi pachetele" })).toHaveAttribute("href", "/ro/pachete");
  await expectAccessible(page);
  await shot(page, "11-tenis", info.project.name);
});

test("in English", async ({ page }) => {
  await page.goto("/en");
  const tennis = page.getByRole("region", { name: "Tennis, at Clubul Tenis Elite." });
  await expect(tennis.getByRole("heading", { level: 3 }).first()).toHaveText("Tennis lessons");
  await expect(tennis.getByRole("link", { name: "See the packages" })).toHaveAttribute("href", "/en/packages");
});
