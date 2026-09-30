/**
 * The full site, section 9 (§9.2.9, Stage 11): Pilates Reformer. The studio in facts (R-100, R-103,
 * Q46), the eight class types (R-101), the waiting list (R-102) and the week's schedule, live from
 * the public API in club time; a full class says the waiting list is open.
 */
import { expect, type Page, test } from "@playwright/test";
import { chooseNecessaryCookies, expectAccessible } from "../helpers";

async function shot(page: Page, name: string, project: string) {
  const dir = process.env.E2E_SCREENSHOTS;
  if (dir) await page.screenshot({ path: `${dir}/${project}-${name}.png` });
}

const TITLE = "Pilates pe Reformer, în grupuri mici.";

test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

test("§9.2.9: the studio, the eight classes, the waiting list and the schedule from the real API", async ({ page }, info) => {
  await page.goto("/ro");
  const pilates = page.getByRole("region", { name: TITLE });
  await pilates.scrollIntoViewIfNeeded();
  await expect(pilates.getByRole("img", { name: "Studioul de pilates: 4 aparate Reformer acum, loc pentru 6" })).toBeVisible();
  await expect(pilates.locator(".pilates__kind h4")).toHaveText([
    "Începători",
    "Intermediar",
    "Avansat",
    "Ședință privată",
    "Duo",
    "Grup",
    "Reformer pentru jucători de tenis/padel",
    "Reformer pentru mămici",
  ]);
  await expect(pilates.getByText(/primul de pe listă primește locul automat/)).toBeVisible();
  const schedule = pilates.getByRole("region", { name: "Programul săptămânii" });
  await expect(schedule).toHaveAttribute("aria-busy", "false");
  // The demo data has no classes: the schedule says when it appears.
  await expect(schedule.getByText("Programul claselor apare aici când îl publică studioul.")).toBeVisible();
  await expect(schedule.getByRole("link", { name: "Rezervă o clasă" })).toHaveAttribute("href", "/ro/rezervari");
  await expect(pilates).not.toContainText(/\d\s?(lei|RON)\b/);
  await expectAccessible(page);
  await pilates.locator(".pilates__intro").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await shot(page, "12-pilates", info.project.name);
});

test("the week in club time, by day, with places left or the waiting list", async ({ page }, info) => {
  // Friday 26.03.2027, 10:00 at the club; summer time starts on Sunday the 28th.
  await page.clock.install({ time: new Date("2027-03-26T08:00:00Z") });
  const item = (id: string, kind: string, starts: string, ends: string, places: number) => ({
    id,
    studio_id: "s",
    kind,
    instructor_name: "Ana",
    starts_at: starts,
    ends_at: ends,
    capacity: 4,
    places_left: places,
    price_total: 0,
    price_provisional: true,
  });
  await page.route("**/api/v1/classes?**", (route) =>
    route.fulfill({
      json: [
        item("a", "beginner", "2027-03-26T16:00:00Z", "2027-03-26T17:00:00Z", 3),
        item("b", "racket_players", "2027-03-28T16:00:00Z", "2027-03-28T17:00:00Z", 0),
        item("c", "mothers", "2027-04-05T07:00:00Z", "2027-04-05T08:00:00Z", 4), // beyond the week
      ],
    }),
  );
  await page.goto("/ro");
  const schedule = page.getByRole("region", { name: "Programul săptămânii" });
  await schedule.scrollIntoViewIfNeeded();
  await expect(schedule.locator(".classes__day h4")).toHaveText(["vineri, 26 martie", "duminică, 28 martie"]);
  const slots = schedule.locator(".classes__slot");
  await expect(slots).toHaveCount(2);
  await expect(slots.nth(0)).toContainText("18:00–19:00");
  await expect(slots.nth(0)).toContainText("Începători");
  await expect(slots.nth(0)).toContainText("cu Ana");
  await expect(slots.nth(0)).toContainText("3 locuri libere");
  await expect(slots.nth(1)).toContainText("19:00–20:00"); // summer time
  await expect(slots.nth(1)).toContainText("Plin · listă de așteptare");
  await expectAccessible(page);
  await shot(page, "13-pilates-program", info.project.name);
});

test("when the schedule cannot be read, it says so", async ({ page }) => {
  await page.route("**/api/v1/classes?**", (route) => route.abort());
  await page.goto("/ro");
  const schedule = page.getByRole("region", { name: "Programul săptămânii" });
  await expect(schedule.getByText("Programul nu se poate încărca acum. Revenim automat.")).toBeVisible();
});

test("in English", async ({ page }) => {
  await page.goto("/en");
  const pilates = page.getByRole("region", { name: "Reformer Pilates, in small groups." });
  await expect(pilates.locator(".pilates__kind h4").first()).toHaveText("Beginners");
  await expect(pilates.getByRole("link", { name: "Book a class" })).toHaveAttribute("href", "/en/bookings");
});
