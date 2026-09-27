import { expect, test } from "@playwright/test";

// scripts/test-e2e builds the site with a test statistics script (NEXT_PUBLIC_UMAMI_SRC).
const statsScript = "script#jp-umami";

test("cookies: nothing optional runs before a choice; reject is as easy as accept (§12.2)", async ({ page, context }) => {
  await page.goto("/ro");
  const banner = page.getByRole("region", { name: "Cookies și confidențialitate" });
  await expect(banner).toBeVisible();
  await expect(page.locator(statsScript)).toHaveCount(0);
  await expect(banner.getByRole("button", { name: "Doar cookies necesare" })).toBeVisible();
  await expect(banner.getByRole("button", { name: "Accept statisticile" })).toBeVisible();

  await banner.getByRole("button", { name: "Doar cookies necesare" }).click();
  await expect(banner).toBeHidden();
  const cookie = (await context.cookies()).find((c) => c.name === "jp_consent");
  expect(JSON.parse(decodeURIComponent(cookie?.value ?? "{}"))).toMatchObject({ v: 1, stats: false });
  await page.reload();
  await expect(page.locator(".cookie-banner")).toHaveCount(0);
  await expect(page.locator(statsScript)).toHaveCount(0);
});

test("cookies: statistics load only after accepting, and the choice can be changed from the footer", async ({ page }) => {
  await page.goto("/ro");
  await page.getByRole("button", { name: "Accept statisticile" }).click();
  await expect(page.locator(statsScript)).toHaveCount(1);

  await page.locator("footer").getByRole("button", { name: "Setări cookies" }).click();
  const statistics = page.getByRole("checkbox", { name: "Statistici anonime" });
  await expect(statistics).toBeChecked();
  await statistics.uncheck();
  await Promise.all([page.waitForEvent("load"), page.getByRole("button", { name: "Salvează alegerea" }).click()]);
  await expect(page.locator(statsScript)).toHaveCount(0);
  await expect(page.locator(".cookie-banner")).toHaveCount(0);
});
