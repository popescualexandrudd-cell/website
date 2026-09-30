/**
 * The full site, the league page (§9.3 `/liga`): the three ladders, the season, rank and name
 * choices (a plain form, no script), the results, the tournaments and the rules, all from the real
 * API and only public fields (R-012, Q49). The website only shows the league (invariant 2). With
 * real league data (after the kiosk and screens stages) see e2e/league-data/.
 */
import { expect, type Page, test } from "@playwright/test";
import { chooseNecessaryCookies, expectAccessible } from "../helpers";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function shot(page: Page, name: string, project: string) {
  const dir = process.env.E2E_SCREENSHOTS;
  if (dir) await page.screenshot({ path: `${dir}/${project}-${name}.png` });
}

test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

test("§9.3: the league page, its ladders, choices and rules, from the real API", async ({ page }, info) => {
  const seasons = (await (await page.request.get(`${API}/api/v1/league/seasons?location=jungle-padel`)).json()) as { status: string }[];
  await page.goto("/ro/liga");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Clasamentele ligii");
  const ladders = page.getByRole("navigation", { name: "Clasamentul" });
  await expect(ladders.getByRole("link")).toHaveText(["Dublu", "Simplu", "Perechi"]);
  await expect(ladders.getByRole("link", { name: "Dublu" })).toHaveAttribute("aria-current", "page");
  const standings = page.getByRole("region", { name: /^Dublu( · |$)/ });
  if (!seasons.some((s) => s.status === "active")) {
    await expect(standings).toContainText("Primul sezon al ligii începe odată cu clubul.");
  }
  // The rules in short; nothing on the page writes to the league.
  await expect(page.getByRole("heading", { level: 2, name: "Regulile, pe scurt" })).toBeVisible();
  await expect(page.getByText(/Se introduc și se confirmă numai la Chioșcul Ligii/)).toBeVisible();
  await expect(page.locator("main form[method='post'], main button[type='button']")).toHaveCount(0);
  await expectAccessible(page);
  await shot(page, "30-liga", info.project.name);

  // Another ladder from the links, then a choice from the form: all in the address.
  await ladders.getByRole("link", { name: "Perechi" }).click();
  await expect(page).toHaveURL(/\/ro\/liga\?ladder=pairs$/);
  await expect(page.getByRole("navigation", { name: "Clasamentul" }).getByRole("link", { name: "Perechi" })).toHaveAttribute("aria-current", "page");
  const filters = page.getByRole("search", { name: "Alege sezonul, rangul sau caută un jucător" });
  await filters.getByLabel("Rangul").selectOption("gold");
  await filters.getByLabel("Caută după nume").fill("Ana");
  await filters.getByRole("button", { name: "Arată" }).click();
  await expect(page).toHaveURL(/ladder=pairs/);
  await expect(page).toHaveURL(/rank=gold/);
  await expect(page).toHaveURL(/q=Ana/);
  await expect(page.getByRole("search").getByLabel("Caută după nume")).toHaveValue("Ana");
});

test("an unknown season or a made-up choice falls back safely; an unknown player is a 404", async ({ page }) => {
  await page.goto("/ro/liga?season=999&ladder=mixed&rank=wood");
  await expect(page.getByRole("navigation", { name: "Clasamentul" }).getByRole("link", { name: "Dublu" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Sezonul ales nu există. Alege altul din listă.")).toBeVisible();
  const missing = await page.goto("/ro/liga/jucator/00000000-0000-0000-0000-000000000000");
  expect(missing?.status()).toBe(404);
  const bad = await page.goto("/ro/liga/jucator/..%2Fadmin");
  expect(bad?.status()).toBe(404);
});

test("in English", async ({ page }) => {
  await page.goto("/en/league");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The league standings");
  await expect(page.getByRole("navigation", { name: "Standings" }).getByRole("link")).toHaveText(["Doubles", "Singles", "Pairs"]);
  await expect(page.getByRole("heading", { level: 2, name: "The rules, in short" })).toBeVisible();
});
