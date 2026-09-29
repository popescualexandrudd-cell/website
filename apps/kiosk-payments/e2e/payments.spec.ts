/**
 * The Payments Kiosk and the café display end to end (§8.3, §8.7): real backend, the real
 * Hardware Bridge with its simulators (scans and every note signed with the bridge's key, the
 * server's commands checked by the bridge), the production builds of both screens.
 * The demo data comes from `manage.py payments_demo` (E2E_PAYMENTS_DATA).
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { readFileSync } from "node:fs";

type Person = { id: string; name: string; card: string };
type Demo = {
  customer: Person;
  partner: Person;
  receptionist: Person & { pin: string };
  booking: { id: string; court: string; price: number };
  credit: number;
  voucher: string;
};
const demo: Demo = JSON.parse(readFileSync(process.env.E2E_PAYMENTS_DATA ?? "", "utf8"));
const DISPLAY = process.env.E2E_DISPLAY_URL ?? "http://localhost:5176";

async function scan(page: Page, code: string) {
  await page.getByLabel("Card code").fill(code);
  await page.getByRole("button", { name: "Scan", exact: true }).click();
}

async function insert(page: Page, ...lei: number[]) {
  for (const value of lei) await page.getByRole("button", { name: `Insert ${value} lei` }).click();
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Ieșire" }).click();
  await expect(page.getByText("Scanează cardul", { exact: true })).toBeVisible();
}

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

test("idle: the call to scan, the café menu, the subscription offers", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Scanează cardul", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Meniul cafenelei" })).toBeVisible();
  await expect(page.getByText("Espresso")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Abonamente" })).toBeVisible();
  await expectAccessible(page);
  await shot(page, "p1-repaus");
});

test("R-121 + §8.3: a voucher, then the rest of the hour in cash, with change and a receipt", async ({ page }) => {
  await page.goto("/");
  await scan(page, demo.customer.card);
  await expect(page.getByRole("heading", { name: "Salut, Demo!" })).toBeVisible();
  await expect(page.getByText("Credit în cont: 50 lei")).toBeVisible();
  await expectAccessible(page);
  await shot(page, "p2-sesiune");

  await page.getByRole("button", { name: /Folosește un voucher/ }).click();
  await page.getByRole("button", { name: "Folosesc" }).click();
  await expect(page.getByRole("status")).toContainText("Voucherul a plătit 30 lei");

  await page.getByRole("button", { name: "Plătesc 210 lei" }).click();
  await expect(page.getByText("Total: 210 lei")).toBeVisible();
  await page.getByRole("button", { name: "Plătesc cu numerar" }).click();
  await expect(page.getByText("Aparatul dă rest.")).toBeVisible();
  await expectAccessible(page);
  await shot(page, "p3-inainte-de-bani");
  await page.getByRole("button", { name: "Introduc bani" }).click();
  await expect(page.getByText("Introdu bancnotele")).toBeVisible();
  await insert(page, 200);
  await expect(page.getByText("Introdus: 200 lei din 210 lei")).toBeVisible();
  await shot(page, "p4-introducere");
  await insert(page, 50);
  await expect(page.getByText("Plată reușită. Mulțumim!")).toBeVisible();
  await expect(page.getByText("Ia-ți restul: 40 lei.")).toBeVisible();
  await expect(page.getByText("Ia-ți bonul fiscal.")).toBeVisible();
  await shot(page, "p5-platit");
  await page.getByRole("button", { name: "Gata" }).click();
  await expect(page.getByText("Nu ai nimic de plătit acum.")).toBeVisible();
  await logout(page);
});

test("§8.3 flow 5 + §8.7: a coffee paid from credit reaches the café display", async ({ page, context }) => {
  await page.goto("/");
  await scan(page, demo.customer.card);
  await page.getByRole("button", { name: "Cafenea" }).click();
  await page.getByRole("button", { name: "Mai mult: Espresso" }).click();
  await page.getByRole("button", { name: "Mai mult: Espresso" }).click();
  await page.getByRole("button", { name: "Mergi la coș" }).click();
  await page.getByRole("button", { name: /Plătesc din credit/ }).click();
  const paid = page.getByRole("status");
  await expect(paid).toContainText("Comanda ta: nr.");
  const number = (await paid.textContent())?.match(/nr\. (\d+)/)?.[1] ?? "";
  await logout(page);

  const display = await context.newPage();
  await display.goto(DISPLAY);
  const order = display.getByLabel(`Comanda ${number}`);
  await expect(order).toContainText("2 × Espresso");
  await expectAccessible(display);
  await shot(display, "p6-afisaj-cafenea");
  await order.getByRole("button", { name: "Încep prepararea" }).click();
  await expect(display.getByLabel(`Comanda ${number}`).getByRole("button", { name: "E gata" })).toBeVisible();
  await display.getByLabel(`Comanda ${number}`).getByRole("button", { name: "E gata" }).click();
  await display.getByLabel(`Comanda ${number}`).getByRole("button", { name: "Ridicată" }).click();
  await expect(display.getByLabel(`Comanda ${number}`)).toHaveCount(0);
});

test("§8.3 flow 4: the subscription configurator, then cancelling before any money", async ({ page }) => {
  await page.goto("/");
  await scan(page, demo.customer.card);
  await page.getByRole("button", { name: "Cumpără abonament" }).click();
  await page.getByRole("button", { name: "Padel", exact: true }).click();
  await page.getByRole("button", { name: "Mai departe" }).click();
  await page.getByRole("button", { name: "Mai departe" }).click();
  await expect(page.getByText(/^Total: /)).toBeVisible();
  await shot(page, "p7-abonament");
  await page.getByRole("button", { name: "Comand și plătesc" }).click();
  await expect(page.getByRole("heading", { name: "Coșul tău" })).toBeVisible();
  await page.getByRole("button", { name: "Plătesc cu numerar" }).click();
  await page.getByRole("button", { name: "Renunț" }).click();
  await expect(page.getByText("Plata a fost anulată.")).toBeVisible();
  await page.getByRole("button", { name: "Gata" }).click();
  await logout(page);
});

test("staff mode (Q54): card + PIN, count the cash, close the day", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Personal" }).click();
  await expect(page.getByText("Scanează cardul de angajat")).toBeVisible();
  await scan(page, demo.receptionist.card);
  for (const digit of demo.receptionist.pin) await page.getByRole("button", { name: digit, exact: true }).click();
  await page.getByRole("button", { name: "Intru" }).click();
  await expect(page.getByRole("heading", { name: "Mod personal: Demo" })).toBeVisible();
  await page.getByRole("button", { name: "Număr banii din aparat" }).click();
  await expect(page.getByRole("status")).toContainText("Numărarea e gata.");
  await expect(page.getByText(/Diferență față de registru/)).toBeVisible();
  await page.getByRole("button", { name: /Închid ziua/ }).click();
  await expect(page.getByText("Încasat azi")).toBeVisible();
  await expectAccessible(page);
  await shot(page, "p8-mod-personal");
  await page.getByRole("button", { name: "Ies din modul personal" }).click();
  await expect(page.getByText("Scanează cardul", { exact: true })).toBeVisible();
});

test("a wrong PIN is refused", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Personal" }).click();
  await scan(page, demo.receptionist.card);
  for (const digit of "000000") await page.getByRole("button", { name: digit, exact: true }).click();
  await page.getByRole("button", { name: "Intru" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
});
