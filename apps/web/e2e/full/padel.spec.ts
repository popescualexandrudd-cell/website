/**
 * The full site, section 5 (§9.2.5, Stage 11): padel. What it is and why it is easy to start, the
 * club's courts, lessons, how to book (R-041, Q3), the tournament formats (§6.14), and no price
 * yet (Q21).
 */
import { expect, type Page, test } from "@playwright/test";
import { chooseNecessaryCookies, expectAccessible } from "../helpers";

async function shot(page: Page, name: string, project: string) {
  const dir = process.env.E2E_SCREENSHOTS;
  if (dir) await page.screenshot({ path: `${dir}/${project}-${name}.png` });
}

test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

test("§9.2.5: padel, the formats and how to book, without a price yet", async ({ page }, info) => {
  await page.goto("/ro");
  const padel = page.getByRole("region", { name: "Ușor de început. Greu de lăsat." });
  await padel.scrollIntoViewIfNeeded();
  await expect(padel.getByRole("img", { name: "Schema unui teren de padel standard, văzut de sus" })).toBeVisible();
  await expect(padel.getByRole("heading", { level: 3, name: "De ce e ușor de început" })).toBeVisible();
  await expect(padel.getByRole("heading", { level: 3 })).toHaveText([
    "De ce e ușor de început",
    "Terenurile noastre",
    "Lecții cu antrenori",
    "Cum rezervi",
    "Formate de turneu",
  ]);
  await expect(padel.getByRole("heading", { level: 4 })).toHaveText(["Americano", "Mexicano", "King of the Court"]);
  await expect(padel.getByText(/60, 90, 120, 150 sau 180 de minute, între 08:00 și 23:00 \(vârf 17:00–22:00\)/)).toBeVisible();
  await expect(padel).not.toContainText(/\d\s?(lei|RON)\b/); // Q21: no price until the owner sets them
  await expectAccessible(page);
  await shot(page, "06-padel", info.project.name);
  await padel.getByRole("link", { name: "Rezervă un teren" }).click();
  await expect(page).toHaveURL(/\/ro\/rezervari$/);
});

test("in English", async ({ page }) => {
  await page.goto("/en");
  const padel = page.getByRole("region", { name: "Easy to start. Hard to stop." });
  await expect(padel.getByRole("heading", { level: 4 })).toHaveText(["Americano", "Mexicano", "King of the Court"]);
  await expect(padel.getByRole("link", { name: "Book a court" })).toHaveAttribute("href", "/en/bookings");
});
