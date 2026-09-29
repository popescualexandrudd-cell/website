/**
 * The full site, section 7 (§9.2.7, Stage 11): Liga Jungle. The ranks on a rising scale (§6.5), how
 * LP is earned, the seasons and the prizes; the points simulator, whose every number is the league
 * engine's answer through the API (never a copy of the formula); the live standings (R-012).
 */
import { expect, type Locator, type Page, test } from "@playwright/test";
import { chooseNecessaryCookies, expectAccessible } from "../helpers";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const QUERY = "location=jungle-padel&you=3.5&partner=3.5&rival_a=3.5&rival_b=3.5&kind=official";

async function shot(page: Page, name: string, project: string) {
  const dir = process.env.E2E_SCREENSHOTS;
  if (dir) await page.screenshot({ path: `${dir}/${project}-${name}.png` });
}

async function open(page: Page, locale = "ro", title = "Din Bronz până la Regele Junglei."): Promise<Locator> {
  await page.goto(`/${locale}`);
  const league = page.getByRole("region", { name: title });
  await league.scrollIntoViewIfNeeded();
  return league;
}

/** The engine's answer for a choice, asked directly. */
async function engine(page: Page, extra: string) {
  const response = await page.request.get(`${API}/api/v1/league/lp-preview?${QUERY}&${extra}`);
  expect(response.ok()).toBe(true);
  return (await response.json()) as { lp: number; change: string; after: { lp: number } };
}

const signed = (lp: number) => (lp > 0 ? `+${lp}` : `${lp}`);

test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

test("§9.2.7: the ranks, how LP is earned, the seasons and the prizes", async ({ page }, info) => {
  const league = await open(page);
  await expect(league.getByText(/doar la Chioșcul Ligii/)).toBeVisible(); // invariant 1: never on the website
  const ranks = league.getByRole("list", { name: "Rangurile ligii, de la Bronz la Regele Junglei" }).locator(".rank__name");
  await expect(ranks).toHaveText(["Bronz", "Argint", "Aur", "Platină", "Diamant", "Maestru", "Regele Junglei"]);
  await expect(league.getByRole("heading", { level: 4 })).toHaveText([
    "Echipe egale: în jur de ±20",
    "Surpriza valorează mai mult",
    "Nivelul te duce spre rangul tău",
    "Turneele: ×1,5",
    "Primele 5 meciuri: plasarea",
  ]);
  await expect(league.getByText(/cel puțin 12 meciuri oficiale/)).toBeVisible();
  await expect(league.getByText(/15% reducere la abonament sau 4 vouchere de 20% la rezervări/)).toBeVisible();
  await expect(league.getByRole("link", { name: "Vezi clasamentul complet" })).toHaveAttribute("href", "/ro/liga");
  await expectAccessible(page);
  await league.locator(".ranks").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await shot(page, "09-liga", info.project.name);
});

test("the points simulator shows exactly what the league engine answers", async ({ page }, info) => {
  const league = await open(page);
  const simulator = league.getByRole("region", { name: "Simulatorul de puncte" });
  await simulator.scrollIntoViewIfNeeded();
  const result = simulator.locator(".points__result");
  const lp = simulator.locator(".points__lp");

  // The start: four players of level 3.5, Silver I with 50 LP, a win.
  const win = await engine(page, "tier=silver&division=I&lp=50&result=win");
  await expect(lp).toHaveText(`${signed(win.lp)} LP`);
  await expect(result).toHaveAttribute("aria-busy", "false");
  await expect(simulator.getByText(`Argint I · ${win.after.lp} LP`)).toBeVisible();

  // A loss.
  await simulator.getByRole("button", { name: "Pierd" }).click();
  const loss = await engine(page, "tier=silver&division=I&lp=50&result=loss");
  expect(loss.lp).toBeLessThan(0);
  await expect(lp).toHaveText(`${loss.lp} LP`);

  // A win with 99 LP: a promotion to Gold IV.
  await simulator.getByRole("button", { name: "Câștig" }).click();
  await simulator.getByRole("slider", { name: "LP în treapta ta", exact: true }).focus();
  await page.keyboard.press("End");
  const promoted = await engine(page, "tier=silver&division=I&lp=99&result=win");
  expect(promoted.change).toBe("promoted");
  await expect(simulator.getByText("Promovezi în Aur IV!")).toBeVisible();
  await expect(simulator.getByText(`Aur IV · ${promoted.after.lp} LP`)).toBeVisible();

  // Stronger opponents: the upset is worth more, as the engine says.
  await simulator.getByRole("slider", { name: "Primul adversar", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(simulator.getByRole("slider", { name: "Primul adversar", exact: true })).toHaveAttribute("aria-valuetext", "7,0");
  const upset = await engine(page, "tier=silver&division=I&lp=99&result=win&rival_a=7");
  expect(upset.lp).toBeGreaterThan(promoted.lp);
  await expect(lp).toHaveText(`+${upset.lp} LP`);

  // Master: no division, more room for LP.
  await simulator.getByRole("combobox", { name: "Rangul tău acum" }).selectOption("master");
  const master = await engine(page, "tier=master&lp=99&result=win&rival_a=7");
  await expect(simulator.getByText(`Maestru · ${master.after.lp} LP`)).toBeVisible();
  await expectAccessible(page);
  await shot(page, "10-liga-simulator", info.project.name);

  // With the keyboard, a control is never hidden under the result pinned on a phone (WCAG 2.4.11).
  await simulator.getByRole("slider", { name: "Nivelul tău", exact: true }).focus();
  await page.keyboard.press("Tab");
  const partner = simulator.getByRole("slider", { name: "Partenerul tău", exact: true });
  await expect(partner).toBeFocused();
  const [control, pinned] = await Promise.all([partner.boundingBox(), result.boundingBox()]);
  if (!control || !pinned) throw new Error("the slider and the result are on screen");
  const apart =
    control.x + control.width <= pinned.x ||
    pinned.x + pinned.width <= control.x ||
    control.y + control.height <= pinned.y ||
    pinned.y + pinned.height <= control.y;
  expect(apart, `slider ${JSON.stringify(control)}, result ${JSON.stringify(pinned)}`).toBe(true);
});

test("when the engine cannot be reached, the simulator says so", async ({ page }) => {
  await page.route("**/api/v1/league/lp-preview**", (route) => route.abort());
  const league = await open(page);
  await expect(league.getByText("Nu putem calcula acum. Încearcă din nou în câteva momente.")).toBeVisible();
});

test("the live standings: the running season's top 5, or when they appear (R-012)", async ({ page }) => {
  const league = await open(page);
  const standings = league.getByRole("region", { name: "Clasamentul live" });
  await expect(standings).toHaveAttribute("aria-busy", "false");
  const seasons = await (await page.request.get(`${API}/api/v1/league/seasons?location=jungle-padel`)).json();
  const running = (seasons as { status: string }[]).some((season) => season.status === "active");
  const rows = running
    ? ((await (await page.request.get(`${API}/api/v1/league/standings?location=jungle-padel`)).json()) as unknown[])
    : [];
  if (rows.length) await expect(standings.locator("tbody tr")).toHaveCount(Math.min(rows.length, 5));
  else await expect(standings).toContainText("Clasamentul apare după primele meciuri ale sezonului.");
});

test("in English", async ({ page }) => {
  const league = await open(page, "en", "From Bronze to King of the Jungle.");
  await expect(league.locator(".rank__name").last()).toHaveText("King of the Jungle");
  const simulator = league.getByRole("region", { name: "The points simulator" });
  await expect(simulator.locator(".points__lp")).toHaveText(/^[+-]?\d+ LP$/);
  await expect(simulator.getByText(/^Your team's chance: \d+%$/)).toBeVisible();
});
