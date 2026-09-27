import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MAIL_DIR = process.env.E2E_MAIL_DIR ?? "";

function latestLink(to: string, path: string): string {
  const files = readdirSync(MAIL_DIR).map((f) => join(MAIL_DIR, f));
  const bodies = files.map((f) => readFileSync(f, "utf8")).filter((b) => b.includes(`To: ${to}`));
  const body = bodies.at(-1) ?? "";
  const match = body.match(new RegExp(`(https?://[^\\s]*${path.replace(/\//g, "\\/")}\\?token=[^\\s]+)`));
  if (!match?.[1]) throw new Error(`no ${path} link for ${to}`);
  return match[1];
}

test("R-140: Romanian home page with every section, no serious accessibility issues", async ({ page }) => {
  await page.goto("/ro");
  await expect(page.locator("html")).toHaveAttribute("lang", "ro");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("junglă");
  for (const id of ["club", "liga", "locatie", "lista"]) await expect(page.locator(`#${id}`)).toBeAttached();
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", /\/en$/);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
});

test("R-140: English page and language switch", async ({ page }) => {
  await page.goto("/ro");
  await page.locator('.lang-switch a[lang="en"]').click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("jungle");
});

test("waitlist: sign up, confirm from the email, then unsubscribe (double opt-in, §12.2)", async ({ page }, info) => {
  test.skip(!MAIL_DIR, "needs E2E_MAIL_DIR from scripts/test-e2e");
  const email = `e2e-${info.project.name}-${Date.now()}@example.test`;
  await page.goto("/ro#lista");
  const form = page.locator("#lista form");
  await form.getByLabel("Nume și prenume").fill("Test E2E");
  await form.getByLabel("Email", { exact: true }).fill(email);
  await form.getByRole("checkbox", { name: "Pilates", exact: true }).check();
  const submit = form.getByRole("button", { name: "Intră pe listă" });
  await expect(submit).toBeEnabled();
  await form.locator('input[name="consent"]').check();
  await submit.click();
  await expect(page.getByRole("status")).toContainText("Verifică-ți emailul");

  await page.goto(latestLink(email, "/ro/lista/confirmare"));
  await expect(page.locator(".status")).toHaveText(/ești pe listă/);

  await page.goto(latestLink(email, "/ro/lista/dezabonare"));
  await page.getByRole("button", { name: "Dezabonează-mă" }).click();
  await expect(page.locator(".status")).toContainText("datele tale au fost șterse");
});

test("waitlist: consent is required before sending", async ({ page }) => {
  await page.goto("/ro#lista");
  const form = page.locator("#lista form");
  await form.getByLabel("Nume și prenume").fill("Fără Acord");
  await form.getByLabel("Email", { exact: true }).fill("fara-acord@example.test");
  await expect(form.getByRole("button", { name: "Intră pe listă" })).toBeEnabled();
  // requestSubmit() runs the browser's own validation, exactly like pressing the button.
  await form.evaluate((f: HTMLFormElement) => f.requestSubmit());
  await expect(page.getByRole("status")).toHaveCount(0);
  expect(await form.locator('input[name="consent"]').evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false);
});

test("email links without a token explain the problem", async ({ page }) => {
  await page.goto("/ro/lista/confirmare");
  await expect(page.locator(".status")).toContainText("nu conține");
});

test("privacy notice is published in both languages", async ({ page }) => {
  await page.goto("/ro/nota-informare");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Nota de informare");
  await page.goto("/en/privacy-notice");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Privacy notice");
});

test("reduced motion: content is visible without animations (§9.4)", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/ro");
  await page.locator("#lista").scrollIntoViewIfNeeded();
  await expect(page.locator("#lista .waitlist")).toHaveCSS("opacity", "1");
  await context.close();
});

test("SEO files: sitemap with both languages, robots closed outside production", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/ro</loc>");
  expect(sitemap).toContain("/en</loc>");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Disallow: \//);
});
