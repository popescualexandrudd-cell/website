/**
 * The full site, section 10 (§9.2.10, Stage 11): the package configurator (R-081). Every price on
 * the page is the server's answer (R-084: the discounts and the rounding), checked against the API;
 * the indicative prices say so (Q21); the Start rule is explained (R-087, Q13).
 */
import { expect, type Locator, type Page, test } from "@playwright/test";
import { chooseNecessaryCookies, expectAccessible } from "../helpers";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function shot(page: Page, name: string, project: string) {
  const dir = process.env.E2E_SCREENSHOTS;
  if (dir) await page.screenshot({ path: `${dir}/${project}-${name}.png` });
}

type Selection = { sport: string; intensity: string };

/** The server's price for a choice, in lei as the page writes them ("1.152 lei"). */
async function priced(page: Page, selections: Selection[], period: string) {
  const response = await page.request.post(`${API}/api/v1/subscriptions/quote`, {
    data: { location: "jungle-padel", selections, period },
  });
  expect(response.ok()).toBe(true);
  const quote = (await response.json()) as { total: number; provisional: boolean };
  return { text: `${new Intl.NumberFormat("ro").format(quote.total / 100)} lei`, provisional: quote.provisional };
}

async function pick(configurator: Locator, group: string, option: string) {
  await configurator.getByRole("group", { name: group }).getByRole("button", { name: option }).click();
}

test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

test("§9.2.10, R-081: sports, intensity and period; the price is the server's, discounts shown", async ({ page }, info) => {
  await page.goto("/ro");
  const configurator = page.getByRole("region", { name: "Configuratorul de pachete" });
  await configurator.scrollIntoViewIfNeeded();
  const total = configurator.locator(".configurator__total");
  const result = configurator.locator(".configurator__result");

  // The start: padel at Activ (8 sessions), monthly.
  const one = await priced(page, [{ sport: "padel", intensity: "active" }], "monthly");
  await expect(total).toContainText(one.text);
  await expect(result).toHaveAttribute("aria-busy", "false");
  if (one.provisional) await expect(result).toContainText("Preț orientativ");
  await expect(configurator.getByText("Start: oricând, în afara orelor de vârf (17:00–22:00). Activ și Pro: oricând.")).toBeVisible();

  // Two sports: the package discount appears (R-084).
  await pick(configurator, "Sporturile", "Pilates Reformer");
  const two = await priced(page, [{ sport: "padel", intensity: "active" }, { sport: "pilates", intensity: "active" }], "monthly");
  await expect(total).toContainText(two.text);
  await expect(result.locator(".is-discount")).toHaveText([/Pachet cu 2 sporturi\s*−10%/]);

  // Pilates at Start, then a quarter: both discounts, and the Start rule for the sessions.
  await pick(configurator, "Pilates Reformer", "Start");
  await pick(configurator, "Perioada", "Trimestrial");
  const quarter = await priced(page, [{ sport: "padel", intensity: "active" }, { sport: "pilates", intensity: "start" }], "quarterly");
  await expect(total).toContainText(quarter.text);
  await expect(total).toContainText("pentru 3 luni");
  await expect(result.locator(".is-discount")).toHaveCount(2);
  await expect(result).toContainText("Cu Start, sesiunile sunt în afara orelor de vârf");
  await expectAccessible(page);
  await shot(page, "14-pachete", info.project.name);

  // The last sport cannot be taken out.
  await pick(configurator, "Sporturile", "Padel");
  await pick(configurator, "Sporturile", "Pilates Reformer");
  await expect(configurator.getByRole("group", { name: "Sporturile" }).getByRole("button", { name: "Pilates Reformer" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("the notes say what a session is, how to buy and the company package", async ({ page }) => {
  await page.goto("/ro");
  const packages = page.getByRole("region", { name: "Abonamentul tău, în trei pași." });
  await expect(packages.getByText(/Terenul se închiriază separat, pe oră/)).toBeVisible();
  await expect(packages.getByText("La Chioșcul de Plăți din club, cu numerar. Plata online nu e activă la deschidere.")).toBeVisible();
  await expect(packages.getByText(/20% reducere la abonamentele din configurator/)).toBeVisible();
  await expect(packages.getByRole("link", { name: "Scrie-ne" })).toHaveAttribute("href", "/ro/contact");
});

test("when the price cannot be worked out, it says so", async ({ page }) => {
  await page.route("**/api/v1/subscriptions/quote", (route) => route.abort());
  await page.goto("/ro");
  const configurator = page.getByRole("region", { name: "Configuratorul de pachete" });
  await expect(configurator.getByText("Nu putem calcula prețul acum. Încearcă din nou în câteva momente.")).toBeVisible();
});

test("in English", async ({ page }) => {
  await page.goto("/en");
  const configurator = page.getByRole("region", { name: "The package configurator" });
  await expect(configurator.locator(".configurator__total")).toContainText(/\d lei\s*for one month/);
});
