/**
 * Technical SEO of the full site (§15.1, Stage 13A): schema.org data on the pages (the club, the
 * questions, the path of a page), the full site's pages in the sitemap with both languages, the
 * full-site title and description, and a useful 404 page.
 */
import { expect, type Page, test } from "@playwright/test";
import { chooseNecessaryCookies, expectAccessible } from "../helpers";

test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

async function schema(page: Page): Promise<{ "@type": string }[]> {
  const texts = await page.locator('script[type="application/ld+json"]').allTextContents();
  return texts.flatMap((text) => {
    const data = JSON.parse(text) as { "@type": string } | { "@type": string }[];
    return Array.isArray(data) ? data : [data];
  });
}

test("§15.1: the club and the questions on the home page, the path on a page", async ({ page }) => {
  await page.goto("/ro");
  const home = await schema(page);
  expect(home.map((d) => d["@type"])).toEqual(expect.arrayContaining(["SportsActivityLocation", "FAQPage"]));
  expect(await page.title()).toContain("Pilates Reformer");
  expect(await page.locator('meta[name="description"]').getAttribute("content")).not.toContain("lista de așteptare");
  await page.goto("/ro/padel");
  const crumbs = (await schema(page)).find((d) => d["@type"] === "BreadcrumbList") as { itemListElement: { name: string }[] } | undefined;
  expect(crumbs?.itemListElement.map((i) => i.name)).toEqual(["Jungle Padel", "Padel"]);
});

test("§15.1: the sitemap has the full site's pages in both languages", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  expect(xml).toContain("/ro/liga");
  expect(xml).toContain("/en/league");
  expect(xml).toContain('hreflang="en"');
  expect(xml).not.toContain("/ro/cont<");
});

test("§15.1: a useful 404 page", async ({ page }) => {
  const response = await page.goto("/ro/nu-exista-pagina-asta");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Pagina nu există" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Rezervări" })).toBeVisible();
  await expectAccessible(page);
});
