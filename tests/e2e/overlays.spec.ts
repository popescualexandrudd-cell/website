import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { newVisitor } from "./helpers";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
type AxePage = ConstructorParameters<typeof AxeBuilder>[0]["page"];

/**
 * The cookie banner and the assistant appear only when the server has the tracking codes or the
 * Anthropic key (see DEPLOY.md). Run against such a server: E2E_BASE_URL=… npx playwright test.
 */
test("bannerul de cookie-uri: alegerea se păstrează și e accesibil", async ({ browser }) => {
  const context = await newVisitor(browser);
  const page = await context.newPage();
  await page.goto("/");
  const banner = page.getByRole("region", { name: "Cookie-uri" });
  // The banner appears once the page is interactive (the choice is read in the browser).
  await banner.waitFor({ timeout: 5_000 }).catch(() => undefined);
  test.skip((await banner.count()) === 0, "fără coduri de măsurare pe acest server");
  const axe = await new AxeBuilder({ page: page as unknown as AxePage })
    .withTags(TAGS)
    .include(".cookie-banner")
    .analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);
  await page.getByRole("button", { name: "Refuz" }).click();
  await expect(banner).toBeHidden();
  const cookies = await context.cookies();
  expect(cookies.find((c) => c.name === "cookie_consent")?.value).toBe("a0.m0");
  // Nothing from Google or Meta loads without consent.
  const scripts = await page.evaluate(() => [...document.scripts].map((s) => s.src).join(" "));
  expect(scripts).not.toMatch(/googletagmanager|facebook/);
  await page.reload();
  await expect(banner).toBeHidden();
  await page.getByRole("button", { name: "Setări cookie-uri" }).click();
  await expect(banner).toBeVisible();
  await context.close();
});

test("asistentul: se deschide, răspunde și e accesibil", async ({ browser }) => {
  const context = await newVisitor(browser);
  await context.addCookies([
    { name: "cookie_consent", value: "a0.m0", url: test.info().project.use.baseURL! },
  ]);
  const page = await context.newPage();
  await page.goto("/academie");
  const launcher = page.getByRole("button", { name: "Întrebări?" });
  await launcher.waitFor({ timeout: 5_000 }).catch(() => undefined);
  test.skip((await launcher.count()) === 0, "asistentul nu e configurat pe acest server");
  await launcher.click();
  const dialog = page.getByRole("dialog", { name: "Asistentul clubului" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "De la ce vârstă poate începe copilul?" }).click();
  await expect(dialog.locator('.assistant-message[data-role="assistant"]').nth(1)).toBeVisible({
    timeout: 30_000,
  });
  await expect(dialog.getByRole("log")).toHaveAttribute("aria-busy", "false", { timeout: 60_000 });
  const axe = await new AxeBuilder({ page: page as unknown as AxePage })
    .withTags(TAGS)
    .include(".assistant-dialog")
    .analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual(
    [],
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await context.close();
});
