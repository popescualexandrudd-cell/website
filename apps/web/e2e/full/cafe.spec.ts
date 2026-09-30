/**
 * The full site, section 13 (§9.2.13, Stage 11): the specialty café. Ordered and paid at the
 * Payments Kiosk, in cash (R-111, Q9), the number on the lobby screen when ready; the menu exactly
 * as the server gives it (R-112: only what is available), its prices marked indicative (Q21).
 * Rendered on the server.
 */
import { expect, type Page, test } from "@playwright/test";
import { chooseNecessaryCookies, expectAccessible } from "../helpers";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TITLE = "Cafea de specialitate, între meciuri.";

type Menu = { name_ro: string; name_en: string; products: { name_ro: string; name_en: string; price: number; marker: string }[] }[];

async function shot(page: Page, name: string, project: string) {
  const dir = process.env.E2E_SCREENSHOTS;
  if (dir) await page.screenshot({ path: `${dir}/${project}-${name}.png` });
}

async function menu(page: Page): Promise<Menu> {
  const response = await page.request.get(`${API}/api/v1/cafe/menu?location=jungle-padel`);
  expect(response.ok()).toBe(true);
  return (await response.json()) as Menu;
}

const lei = (bani: number) => `${new Intl.NumberFormat("ro", { minimumFractionDigits: bani % 100 ? 2 : 0 }).format(bani / 100)} lei`;

test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

test("§9.2.13, R-111: how to order, and the menu from the real API", async ({ page }, info) => {
  const data = await menu(page);
  await page.goto("/ro");
  const cafe = page.getByRole("region", { name: TITLE });
  await cafe.scrollIntoViewIfNeeded();
  await expect(cafe.getByRole("list", { name: "Cum comanzi" }).locator("strong")).toHaveText([
    "Comanzi la Chioșcul de Plăți",
    "Primești bonul cu numărul comenzii",
    "Îți vezi numărul pe ecran",
  ]);
  await expect(cafe.getByText("Alegi din meniu și plătești în numerar, la aparat.")).toBeVisible();

  const list = cafe.getByRole("region", { name: "Meniul" });
  // The indicative menu of seed_initial (Q21): coffee and cold drinks.
  expect(data.length).toBeGreaterThan(0);
  await expect(list.locator(".cafe__category h4")).toHaveText(data.map((category) => category.name_ro));
  const products = data.flatMap((category) => category.products);
  await expect(list.locator(".cafe__products li")).toHaveCount(products.length);
  for (const [i, product] of products.entries()) {
    const row = list.locator(".cafe__products li").nth(i);
    await expect(row).toContainText(product.name_ro);
    await expect(row.locator(".cafe__price")).toHaveText(lei(product.price));
  }
  if (products.some((product) => product.marker !== "confirmed")) await expect(list.getByText(/^Prețuri orientative/)).toBeVisible();
  await expectAccessible(page);
  await shot(page, "18-cafenea", info.project.name);
  await list.scrollIntoViewIfNeeded();
  await shot(page, "19-cafenea-meniu", info.project.name);
});

test("in English", async ({ page }) => {
  const data = await menu(page);
  await page.goto("/en");
  const cafe = page.getByRole("region", { name: "Specialty coffee, between matches." });
  await expect(cafe.getByRole("region", { name: "The menu" }).locator(".cafe__category h4")).toHaveText(
    data.map((category) => category.name_en),
  );
});
