/**
 * The league page with real league data, after the League Kiosk and the screens stages of
 * scripts/test-e2e (a demo season, ranked players, matches confirmed at the kiosk): the standings
 * exactly as the API gives them, a player's public page and their matches (R-012, Q49).
 */
import { expect, type Page, test } from "@playwright/test";
import { chooseNecessaryCookies, expectAccessible } from "../helpers";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Row = { position: number; players: { id: string | null; first_name: string; last_name: string }[]; lp: number };
type Profile = { player: { first_name: string; last_name: string }; matches: { id: string }[] };

async function shot(page: Page, name: string, project: string) {
  const dir = process.env.E2E_SCREENSHOTS;
  if (dir) await page.screenshot({ path: `${dir}/${project}-${name}.png`, fullPage: true });
}

test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

test("§9.3, R-012: the standings as the API gives them, then a player's public page", async ({ page }, info) => {
  test.setTimeout(150_000);
  const rows = (await (await page.request.get(`${API}/api/v1/league/standings?location=jungle-padel`)).json()) as Row[];
  test.skip(!Array.isArray(rows) || rows.length === 0, "no ranked players in this run");
  const table = page.locator(".league-page__standings tbody tr");
  // The page's data refreshes within a minute: reload until it shows the current standings.
  await expect(async () => {
    await page.goto("/ro/liga");
    await expect(table).toHaveCount(rows.length, { timeout: 1000 });
  }).toPass({ timeout: 90_000 });
  for (const [i, row] of rows.entries()) {
    await expect(table.nth(i).locator("td").first()).toHaveText(String(row.position));
    await expect(table.nth(i).locator("td").last()).toHaveText(String(row.lp));
  }
  await expectAccessible(page);
  await shot(page, "31-liga-clasament", info.project.name);

  const first = rows.flatMap((r) => r.players).find((p) => p.id);
  test.skip(!first, "only retired players");
  const profile = (await (await page.request.get(`${API}/api/v1/league/players/${first?.id}?location=jungle-padel`)).json()) as Profile;
  await table.getByRole("link", { name: `${first?.first_name} ${first?.last_name}` }).first().click();
  await expect(page).toHaveURL(new RegExp(`/ro/liga/jucator/${first?.id}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${profile.player.first_name} ${profile.player.last_name}`);
  // After an in-page navigation the title is streamed a moment later: wait for it before axe.
  await expect(page).toHaveTitle(new RegExp(`^${profile.player.first_name} ${profile.player.last_name} · `));
  await expect(page.locator(".league-page__results > li")).toHaveCount(profile.matches.length);
  // R-012: only public data; no badges, statistics or contacts.
  await expect(page.getByText("Pe această pagină apar doar datele publice ale ligii.", { exact: false })).toBeVisible();
  await expect(page.locator("main").getByText(/@|\+40/)).toHaveCount(0);
  await expectAccessible(page);
  await shot(page, "32-liga-jucator", info.project.name);
});
