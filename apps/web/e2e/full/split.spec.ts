/**
 * The full site, section 11 (§9.2.11, Stage 11): "Împarte ora". The price band, the duration and the
 * number of players; what each player pays is the server's answer (the club's rates, R-051; the
 * kiosk's split, R-060, R-061), checked against the API. No credits for padel (invariant 14).
 */
import { expect, type Locator, type Page, test } from "@playwright/test";
import { chooseNecessaryCookies, expectAccessible } from "../helpers";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function shot(page: Page, name: string, project: string) {
  const dir = process.env.E2E_SCREENSHOTS;
  if (dir) await page.screenshot({ path: `${dir}/${project}-${name}.png` });
}

const lei = (bani: number) => `${new Intl.NumberFormat("ro", { minimumFractionDigits: bani % 100 ? 2 : 0 }).format(bani / 100)} lei`;

/** The server's split for a choice. */
async function split(page: Page, band: string, minutes: number, players: number) {
  const response = await page.request.get(
    `${API}/api/v1/pricing/jungle-padel/split?band=${band}&duration_minutes=${minutes}&players=${players}`,
  );
  expect(response.ok()).toBe(true);
  return (await response.json()) as { total: number; shares: number[]; provisional: boolean };
}

async function pick(simulator: Locator, group: string, option: string) {
  await simulator.getByRole("group", { name: group }).getByRole("button", { name: option, exact: true }).click();
}

test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

test("§9.2.11, R-060: the court shared between the players, as the server splits it", async ({ page }, info) => {
  await page.goto("/ro");
  const simulator = page.getByRole("region", { name: "Simulatorul „Împarte ora”" });
  await simulator.scrollIntoViewIfNeeded();
  const total = simulator.locator(".configurator__total");
  const result = simulator.locator(".configurator__result");

  // The start: peak, 90 minutes, four players.
  const start = await split(page, "peak", 90, 4);
  await expect(total).toContainText(lei(start.shares[3] as number));
  await expect(total).toContainText("de persoană");
  await expect(result).toContainText(`Terenul, 90 de minute${lei(start.total)}`);
  await expect(result).toContainText("Programul benzii: 17:00–22:00, în fiecare zi.");
  if (start.provisional) await expect(result).toContainText("Preț orientativ");

  // Three players at semi-peak for an hour: the shares, with the leftover for the first player.
  await pick(simulator, "Când joci", "Semi-vârf");
  await pick(simulator, "Cât joci", "60 de minute");
  await pick(simulator, "Câți plătiți", "3 jucători");
  const three = await split(page, "semi_peak", 60, 3);
  await expect(total).toContainText(lei(three.shares[2] as number));
  if (new Set(three.shares).size > 1) {
    await expect(result.getByText("Jucătorul 1")).toBeVisible();
    await expect(result).toContainText("Banii care nu se împart exact îi plătește primul jucător.");
  }
  await expect(result).toContainText("Programul benzii: 08:00–12:00, 15:00–17:00, în fiecare zi.");
  await expectAccessible(page);
  await shot(page, "15-imparte-ora", info.project.name);

  // One player pays it all.
  await pick(simulator, "Câți plătiți", "1 jucător (plătești tot)");
  await expect(total).toContainText("plătești tot");
});

test("no credits for padel; paid at the kiosk, each their part (invariant 14)", async ({ page }) => {
  await page.goto("/ro");
  const section = page.getByRole("region", { name: "Terenul se plătește la oră. Și se împarte." });
  await expect(section.getByText(/nu cumperi credite/)).toBeVisible();
  await expect(section.getByText(/Fiecare își scanează cardul și își plătește partea/)).toBeVisible();
  await expect(section.getByRole("link", { name: "Rezervă un teren" })).toHaveAttribute("href", "/ro/rezervari");
});

test("when the price cannot be worked out, it says so", async ({ page }) => {
  await page.route("**/api/v1/pricing/*/split**", (route) => route.abort());
  await page.goto("/ro");
  const simulator = page.getByRole("region", { name: "Simulatorul „Împarte ora”" });
  await expect(simulator.getByText("Nu putem calcula acum. Încearcă din nou în câteva momente.")).toBeVisible();
});

test("in English", async ({ page }) => {
  await page.goto("/en");
  const simulator = page.getByRole("region", { name: 'The "Share the hour" simulator' });
  await expect(simulator.locator(".configurator__total")).toContainText(/\d lei\s*each/);
});
