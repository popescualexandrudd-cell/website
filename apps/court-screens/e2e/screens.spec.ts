/**
 * The court and lobby screens end to end (§8.5): real backend (live updates through Redis, as
 * in production), a real Hardware Bridge on each screen's machine giving it its configuration,
 * the production builds. The demo data comes from `manage.py screens_demo` (E2E_SCREENS_DATA):
 * the example of §8.5 on "Teren 4".
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

type Demo = { players: string[]; booking: { id: string; court: string; next_today: boolean } };
const demo: Demo = JSON.parse(readFileSync(process.env.E2E_SCREENS_DATA ?? "", "utf8"));
const COURT = process.env.E2E_COURT_URL ?? "http://localhost:5177";
const LOBBY = process.env.E2E_LOBBY_URL ?? "http://localhost:5178";

async function shot(page: Page, name: string) {
  const dir = process.env.E2E_SCREENSHOTS;
  if (dir) await page.screenshot({ path: `${dir}/${name}.png` });
}

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

test.describe.configure({ mode: "serial" });

test("§8.5: the court screen shows the league match of the example", async ({ page }) => {
  await page.goto(COURT);
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toContainText("TEREN 4 · ");
  await expect(heading).toContainText(" · 90 MIN · MECI OFICIAL DE LIGĂ");
  const example: [string, string][] = [
    ["Popescu Alexandru Daniel", "Diamant II · 67 LP · Nivel 5.2"],
    ["Moșteanu Rareș", "Diamant III · 12 LP · Nivel 5.0"],
    ["Jucător 3", "Platină I · 88 LP · Nivel 4.8"],
    ["Jucător 4", "Diamant IV · 40 LP · Nivel 4.9"],
  ];
  for (const [name, details] of example) {
    await expect(page.getByRole("listitem").filter({ hasText: name })).toContainText(details);
  }
  await expect(page.getByText("vs", { exact: true })).toBeVisible();
  // Up to an hour left (01:00 right after a half hour starts). The training after the match shows
  // as "next" when it is today: the screen lists today's bookings only (after 23:00 it is tomorrow).
  const left = "Timp rămas: (00:\\d\\d|01:00)";
  const next = demo.booking.next_today ? " · Următorul: \\d\\d:\\d\\d Antrenament" : "";
  await expect(page.getByText(new RegExp(`^${left}${next}$`))).toBeVisible();
  await expect(page.getByRole("img", { name: /^Cod QR spre / })).toBeVisible();
  await expect(page.getByRole("status")).toHaveClass(/connection--live/); // the live link is up
  await expectAccessible(page);
  await shot(page, "e1-ecran-teren");
});

test("§8.5: the lobby shows every court, then a change arrives live", async ({ page }) => {
  await page.goto(LOBBY);
  await expect(page.getByRole("article", { name: "Teren 4" })).toContainText("Meci oficial de ligă");
  await expect(page.getByRole("article", { name: "Teren 1" })).toContainText("Liber");
  await expect(page.getByRole("region", { name: "Clasament dublu" })).toContainText("Popescu Alexandru Daniel");
  await expect(page.getByRole("status")).toHaveClass(/connection--live/);
  await expectAccessible(page);
  await shot(page, "e2-ecran-lobby");

  // A booking made elsewhere (another process, as the website or the reception would): the
  // lobby hears "changed" through Redis and shows the court busy, without reloading the page.
  const reloads: string[] = [];
  page.on("framenavigated", (frame) => reloads.push(frame.url()));
  execFileSync("uv", ["run", "python", "manage.py", "screens_demo", "--rental", "Teren 1"], {
    cwd: "../backend",
    stdio: "pipe",
  });
  const first = page.getByRole("article", { name: "Teren 1" });
  await expect(first).toContainText("Închiriere", { timeout: 10_000 });
  await expect(first).toContainText(demo.players[0] ?? "");
  expect(reloads).toEqual([]);
  await shot(page, "e3-ecran-lobby-live");
});

test("§8.5: the last state stays on screen when the server cannot be reached", async ({ page, context }) => {
  await page.goto(COURT);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("TEREN 4");
  await expect(page.getByRole("status")).toHaveClass(/connection--live/);
  await context.route("**/api/v1/device/screen/**", (route) => route.abort());
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("TEREN 4"); // never blank
  await expect(page.getByText("Popescu Alexandru Daniel")).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Se reconectează…");
  await shot(page, "e4-fara-server");
});
