import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chooseNecessaryCookies, expectAccessible } from "./helpers";

const MAIL_DIR = process.env.E2E_MAIL_DIR ?? "";

function latestLink(to: string, path: string): string {
  const files = readdirSync(MAIL_DIR).map((f) => join(MAIL_DIR, f));
  const bodies = files.map((f) => readFileSync(f, "utf8")).filter((b) => b.includes(`To: ${to}`));
  const body = bodies.at(-1) ?? "";
  const match = body.match(new RegExp(`(https?://[^\\s]*${path.replace(/\//g, "\\/")}\\?token=[^\\s]+)`));
  if (!match?.[1]) throw new Error(`no ${path} link for ${to}`);
  return match[1];
}

test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

test("R-140: Romanian home page with every section, alt text on renders, no serious accessibility issues", async ({ page }) => {
  await page.goto("/ro");
  await expect(page.locator("html")).toHaveAttribute("lang", "ro");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("trei metri");
  for (const id of ["arena", "ecosistem", "facilitati", "liga", "locatie", "lista"]) await expect(page.locator(`#${id}`)).toBeAttached();
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", /\/en$/);
  for (const img of await page.locator("main img").all()) expect((await img.getAttribute("alt"))?.length).toBeGreaterThan(20);
  await expect(page.getByText("Randare 3D ilustrativă")).toBeVisible();
  await expectAccessible(page);
});

test("keyboard: the skip link is the first stop and is visible on focus (WCAG 2.4.1, 2.4.7)", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "no physical keyboard on phones");
  await page.goto("/ro");
  await page.keyboard.press("Tab");
  const skip = page.locator(".skip-link");
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
});

test("R-140: English page and language switch", async ({ page }) => {
  await page.goto("/ro");
  await page.locator('.lang-switch a[lang="en"]').click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("three metres");
});

test("league card: every status tier can be chosen, also without WebGL", async ({ page }) => {
  await page.goto("/ro#liga");
  const platinum = page.locator("#liga").getByRole("button", { name: "Platină" });
  await platinum.click();
  await expect(platinum).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#liga .card-stage img")).toHaveAttribute("src", "/renders/card-platinum.webp");
});

test("footer: trader identification, legal pages and the ANPC link (consumer law)", async ({ page }) => {
  await page.goto("/ro");
  const footer = page.locator("footer");
  for (const label of ["Denumire", "CUI", "Nr. Registrul Comerțului", "Sediu", "Telefon", "Email"]) {
    await expect(footer.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(footer.getByRole("link", { name: /ANPC/ })).toHaveAttribute("href", "https://anpc.ro/ce-este-sal/");
  await footer.getByRole("link", { name: "Politica de anulare și rambursare" }).click();
  await expect(page).toHaveURL(/\/ro\/anulare-si-rambursare$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Politica de anulare și rambursare");
});

test("waitlist: sign up with name, email and level, confirm from the email, then unsubscribe (double opt-in, §12.2)", async ({ page }, info) => {
  test.skip(!MAIL_DIR, "needs E2E_MAIL_DIR from scripts/test-e2e");
  const email = `e2e-${info.project.name}-${Date.now()}@example.test`;
  await page.goto("/ro#lista");
  const form = page.locator("#lista form");
  // Data minimisation: exactly three fields plus the consent.
  await expect(form.locator("input:not([type=checkbox]):not([name=website]), select")).toHaveCount(3);
  await form.getByLabel("Nume și prenume").fill("Test E2E");
  await form.getByLabel("Adresa de email").fill(email);
  await form.getByLabel("Nivelul de joc (opțional)").selectOption("advanced");
  const submit = form.getByRole("button", { name: "Înscrie-te pe lista de așteptare" });
  await expect(submit).toBeEnabled();
  await form.locator('input[name="consent"]').check();
  await submit.click();
  await expect(page.getByRole("status")).toContainText("Verifică-ți emailul");

  await page.goto(latestLink(email, "/ro/lista/confirmare"));
  await expect(page.locator(".status")).toHaveText(/ești pe listă/);

  await page.goto(latestLink(email, "/ro/lista/dezabonare"));
  await page.getByRole("button", { name: "Confirmă dezabonarea" }).click();
  await expect(page.locator(".status")).toContainText("datele tale au fost șterse");
});

test("waitlist: consent is required before sending", async ({ page }) => {
  await page.goto("/ro#lista");
  const form = page.locator("#lista form");
  await form.getByLabel("Nume și prenume").fill("Fără Acord");
  await form.getByLabel("Adresa de email").fill("fara-acord@example.test");
  await expect(form.getByRole("button", { name: "Înscrie-te pe lista de așteptare" })).toBeEnabled();
  // requestSubmit() runs the browser's own validation, exactly like pressing the button.
  await form.evaluate((f: HTMLFormElement) => f.requestSubmit());
  await expect(page.getByRole("status")).toHaveCount(0);
  expect(await form.locator('input[name="consent"]').evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false);
});

test("email links without a token explain the problem", async ({ page }) => {
  await page.goto("/ro/lista/confirmare");
  await expect(page.locator(".status")).toContainText("nu conține");
});

const LEGAL_PAGES: [string, string][] = [
  ["/ro/termeni-si-conditii", "Termeni și condiții"],
  ["/ro/confidentialitate", "Politica de confidențialitate"],
  ["/ro/anulare-si-rambursare", "Politica de anulare și rambursare"],
  ["/ro/cookies", "Politica de cookies"],
  ["/ro/nota-informare", "Nota de informare"],
  ["/en/terms", "Terms and conditions"],
  ["/en/privacy", "Privacy policy"],
  ["/en/refunds", "Cancellation and refund policy"],
  ["/en/cookies", "Cookie policy"],
  ["/en/privacy-notice", "Privacy notice"],
];

test("legal pages (terms, privacy, refunds, cookies, notice) are published in both languages", async ({ page }) => {
  for (const [path, title] of LEGAL_PAGES) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }), path).toContainText(title);
    await expect(page.locator(".status[data-kind=error]"), path).toHaveCount(0);
  }
  await page.goto("/ro/termeni-si-conditii");
  await expectAccessible(page);
});

test("reduced motion: content is visible without animations (§9.4)", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  await chooseNecessaryCookies(context, baseURL);
  const page = await context.newPage();
  await page.goto("/ro");
  await page.locator("#lista").scrollIntoViewIfNeeded();
  await expect(page.locator("#lista .form-panel")).toHaveCSS("opacity", "1");
  await context.close();
});

test("mobile menu reaches every section", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "the menu button exists only on narrow screens");
  await page.goto("/ro");
  await page.getByText("Meniu", { exact: true }).click();
  await page.locator(".mobile-nav").getByRole("link", { name: "Liga" }).click();
  await expect(page).toHaveURL(/#liga$/);
  await expect(page.locator(".mobile-nav")).not.toHaveAttribute("open", "");
});

test("SEO files: sitemap with both languages and the legal pages, robots closed outside production", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const loc of ["/ro</loc>", "/en</loc>", "/ro/termeni-si-conditii</loc>", "/en/refunds</loc>"]) expect(sitemap).toContain(loc);
  expect(sitemap).not.toContain("confirmare");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Disallow: \//);
});

test("Q57: before the launch, the full site's pages do not exist", async ({ request }) => {
  for (const path of ["/ro/liga", "/en/league", "/ro/rezervari", "/ro/cont"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});
