/**
 * The club's blog (§9.3 `/blog`, §15.2): the published articles from the real API (the demo article
 * of `seed_initial --demo`, marked as such), one article with its Markdown text, its own address in
 * both languages and its structured data; anything else is a 404.
 */
import { expect, type Page, test } from "@playwright/test";
import { chooseNecessaryCookies, expectAccessible } from "../helpers";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function shot(page: Page, name: string, project: string) {
  const dir = process.env.E2E_SCREENSHOTS;
  if (dir) await page.screenshot({ path: `${dir}/${project}-${name}.png` });
}

test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

test("§9.3: the list of articles, then one article", async ({ page, request }, info) => {
  const published = await (await request.get(`${API}/api/v1/blog?location=jungle-padel`)).json();
  await page.goto("/ro/blog");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Blog");
  const cards = page.locator(".blog-card");
  await expect(cards).toHaveCount(published.length);
  const demo = cards.filter({ hasText: "Cum funcționează Liga Jungle (articol demo)" });
  await expect(demo.getByText("Articol demo", { exact: true })).toBeVisible();
  await expectAccessible(page);
  await shot(page, "58-blog", info.project.name);

  await demo.getByRole("link", { name: "Cum funcționează Liga Jungle (articol demo)" }).click();
  await expect(page).toHaveURL(/\/ro\/blog\/cum-functioneaza-liga-demo$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cum funcționează Liga Jungle (articol demo)");
  await expect(page.getByRole("heading", { level: 2, name: "Cine intră în ligă" })).toBeVisible();
  await expect(page.locator(".blog-article__body li")).toHaveCount(3);
  await expect(page.locator(".blog-article__body strong")).toHaveText("numai la Chioșcul Ligii");
  await expect(page.locator(".blog-article__body").getByRole("link", { name: "clasamentele" })).toHaveAttribute("href", "/ro/liga");
  await expect(page.getByText(/minut(e)? de citit/)).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/ro\/blog\/cum-functioneaza-liga-demo$/);
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", /\/en\/blog\/cum-functioneaza-liga-demo$/);
  const data = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
  expect(data).toMatchObject({ "@type": "BlogPosting", headline: "Cum funcționează Liga Jungle (articol demo)", inLanguage: "ro" });
  await expectAccessible(page);
  await shot(page, "59-blog-articol", info.project.name);

  await page.getByRole("link", { name: "← Toate articolele" }).click();
  await expect(page).toHaveURL(/\/ro\/blog$/);
});

test("in English; an unknown or malformed address is a 404", async ({ page }) => {
  await page.goto("/en/blog/cum-functioneaza-liga-demo");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("How the Jungle League works (demo article)");
  await expect(page.getByRole("heading", { level: 2, name: "Who joins the league" })).toBeVisible();
  for (const path of ["/ro/blog/nu-exista", "/ro/blog/Nu%20Exista"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
});

test("the footer leads to the new pages", async ({ page }) => {
  await page.goto("/ro");
  const footer = page.locator(".footer-club");
  const links: [string, string][] = [
    ["Pentru firme", "/ro/corporate"],
    ["Despre club", "/ro/despre"],
    ["Blog", "/ro/blog"],
  ];
  for (const [name, href] of links) {
    await expect(footer.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
  }
});
