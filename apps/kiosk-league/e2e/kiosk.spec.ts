/**
 * The League Kiosk end to end (§8.2): real backend, the real Hardware Bridge with its
 * simulators (scans signed with the bridge's key), the production build of this app.
 * The demo data comes from `manage.py kiosk_demo` (E2E_KIOSK_DATA).
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { readFileSync } from "node:fs";

type Demo = {
  players: { id: string; name: string; card: string }[];
  newcomer: { id: string; name: string; card: string };
  booking: { court: string };
};
const demo: Demo = JSON.parse(readFileSync(process.env.E2E_KIOSK_DATA ?? "", "utf8"));
const card = (n: number) => demo.players[n]!.card;

async function scan(page: Page, code: string) {
  await page.getByLabel("Card code").fill(code);
  await page.getByRole("button", { name: "Scan" }).click();
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Ieșire" }).click();
  await expect(page.getByText("Scanează cardul", { exact: true })).toBeVisible();
}

/** Screenshots for the stage report (only when E2E_SCREENSHOTS is set). */
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

test("idle screen: standings, Match of the day, the call to scan", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Scanează cardul", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Meciul zilei" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Regii Junglei" })).toBeVisible();
  await expectAccessible(page);
  await shot(page, "1-repaus");
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByText("Scan your card", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Română" }).click();
});

test("an unknown card is refused kindly", async ({ page }) => {
  await page.goto("/");
  await scan(page, "COD-INEXISTENT-123");
  await expect(page.getByRole("alert")).toContainText("Cardul nu este valabil");
});

test("R-010: a newcomer joins the league with the GDPR consent", async ({ page }) => {
  await page.goto("/");
  await scan(page, demo.newcomer.card);
  await expect(page.getByRole("heading", { name: "Salut, Demo!" })).toBeVisible();
  await expect(page.getByText("Nu ești încă în ligă.")).toBeVisible();
  await page.getByRole("button", { name: "Înscriere în ligă (GDPR)" }).click();
  const sign = page.getByRole("button", { name: "Semnez acordul" });
  await expect(sign).toBeDisabled();
  await expectAccessible(page);
  await shot(page, "2-acord-gdpr");
  await page.getByLabel("Am citit și sunt de acord").check();
  await sign.click();
  await expect(page.getByRole("status")).toContainText("Acordul e semnat");
  await expect(page.getByRole("button", { name: /Introdu scorul/ })).toBeVisible();
  await logout(page);
});

test("§8.2 actions 2–3: the score is entered, then confirmed by the others", async ({ page }) => {
  await page.goto("/");
  await scan(page, card(0));
  await expect(page.getByRole("heading", { name: "Salut, Demo!" })).toBeVisible();
  await shot(page, "3-sesiune");
  await page.getByRole("button", { name: /Introdu scorul/ }).click();
  const pick = page.getByRole("button", { name: new RegExp(demo.booking.court) });
  if (await pick.isVisible()) await pick.click();
  for (const [label, times] of [["Setul 1 A", 6], ["Setul 1 B", 2], ["Setul 2 A", 6], ["Setul 2 B", 3]] as const) {
    for (let i = 0; i < times; i++) await page.getByLabel(`${label}: Mai mult`).click();
  }
  await expectAccessible(page);
  await shot(page, "4-scor");
  await page.getByRole("button", { name: "Trimite scorul" }).click();
  await expect(page.getByRole("status")).toContainText("Scorul a fost trimis");
  await logout(page);

  for (const n of [1, 2, 3]) {
    await scan(page, card(n));
    await page.getByRole("button", { name: /Confirmă sau contestă/ }).click();
    await expect(page.getByText("6–2, 6–3")).toBeVisible();
    await page.getByRole("button", { name: "Confirm scorul" }).click();
    await expect(page.getByRole("status")).toContainText("Ai confirmat scorul");
    await logout(page);
  }
});

test("§8.2 actions 5–6: check-in and the standings search", async ({ page }) => {
  await page.goto("/");
  await scan(page, card(1));
  await page.getByRole("button", { name: "Check-in" }).click();
  await expect(page.getByRole("status")).toContainText("Check-in făcut");
  await page.getByRole("button", { name: "Clasamente" }).click();
  for (const key of "DEMO") await page.getByRole("button", { name: key, exact: true }).click();
  await expect(page.locator(".search")).toContainText("demo");
  await shot(page, "5-clasamente");
  await logout(page);
});

test("§8.2: logged out after 30 seconds without a touch", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await scan(page, card(2));
  await expect(page.getByRole("heading", { name: "Salut, Demo!" })).toBeVisible();
  await page.clock.fastForward(22_000);
  await expect(page.getByText(/Ieșire automată în/)).toBeVisible();
  await page.clock.fastForward(10_000);
  await expect(page.getByText("Scanează cardul", { exact: true })).toBeVisible();
});
