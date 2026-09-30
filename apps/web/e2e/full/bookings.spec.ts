/**
 * Online booking (§9.3 `/rezervari`) without an account: the courts' free times from the public
 * availability (R-041, no personal data), the club's price (R-052), and signing in to book. The
 * booking itself, with an account, is in account.spec.ts.
 */
import { expect, test } from "@playwright/test";
import { chooseNecessaryCookies, expectAccessible } from "../helpers";

test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

test("§9.3, R-041, R-052: a day, a duration, a free time, the price, then signing in to book", async ({ page }) => {
  await page.goto("/ro/rezervari");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rezervări");
  const days = page.getByRole("group", { name: "Ziua" });
  await expect(days.getByRole("button")).toHaveCount(14);
  await expect(days.getByRole("button").first()).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("group", { name: "Durata" }).getByRole("button", { name: "60 min" }).click();
  await days.getByRole("button").nth(3).click();
  await expect(page.locator(".booking__court").first()).toBeVisible();
  // Every start is on the 30-minute grid, and nothing is booked without an account.
  for (const time of await page.locator(".booking__time").allTextContents()) expect(time).toMatch(/^\d{2}:(00|30)$/);
  await page.locator(".booking__time:not([disabled])").first().click();
  await expect(page.locator(".booking__summary .configurator__total")).toContainText("lei");
  await expect(page.getByText("Ca să rezervi, intră în cont.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Rezervă", exact: true })).toHaveCount(0);
  await expect(page.getByText("Nu cumperi credite.")).toBeVisible();
  await expectAccessible(page);
});

test("in English", async ({ page }) => {
  await page.goto("/en/bookings");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bookings");
  await expect(page.getByRole("group", { name: "Duration" })).toBeVisible();
});
