/**
 * The full site, section 4 (§9.2.4, Stage 11): "Acum în club", live from the public API. The
 * courts say free, busy or closed, never who plays (R-012); the Match of the day, the Kings and the
 * next tournament show what the API says, or say they are coming.
 */
import { expect, type Page, test } from "@playwright/test";
import { chooseNecessaryCookies, expectAccessible } from "../helpers";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const STATE = /^(Liber|Liber până la \d\d:\d\d|Ocupat până la \d\d:\d\d|Închis acum · deschidem la \d\d:\d\d)$/;

async function shot(page: Page, name: string, project: string) {
  const dir = process.env.E2E_SCREENSHOTS;
  if (dir) await page.screenshot({ path: `${dir}/${project}-${name}.png` });
}

test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

test("§9.2.4: the four courts now and what the league says, from the real API", async ({ page, request }, info) => {
  await page.goto("/ro");
  const now = page.getByRole("region", { name: "Acum în club." });
  await now.scrollIntoViewIfNeeded();
  await expect(now.getByText(/^Actualizat la \d\d:\d\d$/)).toBeVisible();
  await expect(now.locator(".live")).toHaveAttribute("aria-busy", "false");
  const courts = now.getByRole("region", { name: "Terenurile acum" }).getByRole("listitem");
  await expect(courts.locator(".live__name")).toHaveText(["Teren 1", "Teren 2", "Teren 3", "Teren 4"]);
  for (const state of await courts.locator(".live__state").allTextContents()) expect(state).toMatch(STATE);

  const kings = await request.get(`${API}/api/v1/league/kings?location=jungle-padel`);
  const spotlight = await request.get(`${API}/api/v1/league/match-of-the-day?location=jungle-padel`);
  const kingsPanel = now.getByRole("region", { name: "Regii Junglei" });
  if (kings.ok() && (await kings.json()).length) await expect(kingsPanel.getByRole("listitem").first()).toBeVisible();
  else await expect(kingsPanel).toContainText("Clasamentul apare după primele meciuri ale sezonului.");
  const spotlightPanel = now.getByRole("region", { name: "Meciul zilei" });
  if (spotlight.ok() && (await spotlight.json()).found) await expect(spotlightPanel.locator(".live__match")).toBeVisible();
  else await expect(spotlightPanel).toContainText("Meciul zilei se anunță în curând.");
  await expectAccessible(page);
  await shot(page, "05-acum-in-club", info.project.name);
});

test("busy until, free until, then a new booking shows a minute later", async ({ page }) => {
  // 18:10 at the club: court 1 is booked back to back until 20:30, court 2 from 20:00.
  await page.clock.install({ time: new Date("2027-04-05T15:10:00Z") });
  const busy = (starts: string, ends: string) => ({ starts_at: starts, ends_at: ends });
  const court = (n: number, intervals: { starts_at: string; ends_at: string }[]) => ({ id: `c${n}`, kind: "padel_court", name: `Teren ${n}`, busy: intervals });
  let courts = [
    court(1, [busy("2027-04-05T15:00:00Z", "2027-04-05T16:30:00Z"), busy("2027-04-05T16:30:00Z", "2027-04-05T17:30:00Z")]),
    court(2, [busy("2027-04-05T17:00:00Z", "2027-04-05T18:30:00Z")]),
    court(3, []),
    court(4, []),
  ];
  await page.route("**/api/v1/bookings/availability**", (route) =>
    route.fulfill({ json: { day: "2027-04-05", open: "08:00", close: "23:00", durations_minutes: [60, 90], resources: courts } }),
  );
  await page.goto("/ro");
  const list = page.getByRole("region", { name: "Terenurile acum" }).getByRole("listitem");
  await expect(list.locator(".live__state")).toHaveText(["Ocupat până la 20:30", "Liber până la 20:00", "Liber", "Liber"]);
  await expect(list.filter({ hasText: "Teren 1" })).not.toContainText(/Demo|Popescu/); // never who plays

  courts = [...courts.slice(0, 2), court(3, [busy("2027-04-05T15:00:00Z", "2027-04-05T16:00:00Z")]), courts[3]!];
  await page.clock.fastForward(61_000);
  await expect(list.nth(2).locator(".live__state")).toHaveText("Ocupat până la 19:00");
  await expect(page.getByText("Actualizat la 18:11")).toBeVisible();
});

test("when the API cannot be reached, the section says so and keeps its place", async ({ page }) => {
  await page.route("**/api/v1/bookings/availability**", (route) => route.abort());
  await page.goto("/ro");
  const now = page.getByRole("region", { name: "Acum în club." });
  await expect(now.getByText("Datele live nu sunt disponibile acum. Revenim automat.")).toBeVisible();
  await expect(now.getByRole("region", { name: "Terenurile acum" })).toBeVisible();
});
