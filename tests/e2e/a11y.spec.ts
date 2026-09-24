import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin, newVisitor } from "./helpers";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// @axe-core/playwright is typed against its own playwright-core copy; the page is the same object.
type AxePage = ConstructorParameters<typeof AxeBuilder>[0]["page"];

async function violations(page: Page, scope: (builder: AxeBuilder) => AxeBuilder = (b) => b) {
  const result = await scope(
    new AxeBuilder({ page: page as unknown as AxePage }).withTags(TAGS),
  ).analyze();
  return result.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`,
  );
}

const PUBLIC = [
  "/",
  "/programe",
  "/programe/lectie-individuala",
  "/preturi",
  "/rezervare",
  "/contact",
  "/intrebari",
  "/galerie",
  "/despre",
  "/facilitati",
  "/en",
];
const ADMIN = [
  "/admin",
  "/admin/rezervari",
  "/admin/disponibilitate",
  "/admin/continut/programe",
  "/admin/media",
  "/admin/setari",
];

test("paginile publice nu au probleme de accesibilitate (axe, WCAG 2.2 AA)", async ({
  browser,
}) => {
  test.setTimeout(300_000);
  for (const reducedMotion of ["reduce", "no-preference"] as const) {
    const context = await browser.newContext({
      reducedMotion,
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    for (const path of PUBLIC) {
      await page.goto(path, { waitUntil: "networkidle" });
      expect(await violations(page), `${path} (${reducedMotion})`).toEqual([]);
    }
    await context.close();
  }
});

test("panoul de administrare nu are probleme de accesibilitate, nici pe telefon", async ({
  browser,
}) => {
  const context = await newVisitor(browser);
  const page = await context.newPage();
  await loginAsAdmin(page);
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const path of ADMIN) {
      await page.goto(path, { waitUntil: "networkidle" });
      expect(await violations(page), `${path} (${viewport.width}px)`).toEqual([]);
    }
  }
  await context.close();
});
