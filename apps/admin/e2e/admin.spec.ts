/**
 * The admin panel end to end (§8.6): the real backend, the production build of the panel served
 * with its /api proxy (same origin: session cookie + CSRF). An administrator signs in with the
 * code from the authenticator app; the demo manager's first sign-in sets up two-factor
 * authentication. The manager books, moves (drag and drop) and cancels in the calendar; the
 * administrator sees the audit of it, the league without any score field (invariant 1), the
 * reports' CSV export and the system status. The data comes from `bootstrap_admin` and
 * `manage.py panel_demo` (E2E_ADMIN_DATA).
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { totp } from "./totp";

type Data = {
  admin: { email: string; password: string; secret: string };
  password: string;
  demo: { day: string; staff: string[]; courts: string[]; bookings: { id: string; court: string; organizer: string }[] };
};
const data: Data = JSON.parse(readFileSync(process.env.E2E_ADMIN_DATA ?? "", "utf8"));
const manager = data.demo.staff[0]!;

async function shot(page: Page, name: string) {
  const dir = process.env.E2E_SCREENSHOTS;
  if (dir) await page.screenshot({ path: `${dir}/${name}.png`, fullPage: false });
}

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

/** A code for a new 30-second window: the server refuses a code used twice (replay). */
async function freshCode(secret: string, used: Set<string>): Promise<string> {
  for (;;) {
    const code = totp(secret);
    if (!used.has(code)) {
      used.add(code);
      return code;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function credentials(page: Page, email: string, password: string) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Administrare Jungle Padel" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Parola").fill(password);
  await page.getByRole("button", { name: "Intră" }).click();
}

async function go(page: Page, module: string) {
  await page.getByRole("navigation", { name: "Modulele panoului" }).getByRole("link", { name: module }).click();
}

test.describe.configure({ mode: "serial" });

test("the manager's first sign-in sets up two-factor authentication, then the calendar", async ({ page }) => {
  await credentials(page, manager, data.password);
  const secret = (await page.getByLabel("Cheia pentru aplicația de autentificare").textContent())?.trim() ?? "";
  expect(secret).toMatch(/^[A-Z2-7]{16,}$/);
  await expectAccessible(page);
  await shot(page, "01-configurare-2fa");
  await page.getByLabel("Codul din aplicația de autentificare").fill(totp(secret));
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("list", { name: "Codurile de rezervă" }).getByRole("listitem")).toHaveCount(10);
  await page.getByRole("button", { name: "Le-am salvat, intru în panou" }).click();

  await expect(page.getByRole("heading", { name: "Tablou de bord" })).toBeVisible();
  const menu = page.getByRole("navigation", { name: "Modulele panoului" });
  await expect(menu.getByRole("link", { name: "Rapoarte și exporturi" })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Dispozitive" })).toHaveCount(0); // admin only
  await expectAccessible(page);
  await shot(page, "02-tablou-de-bord");

  await go(page, "Calendar rezervări");
  await page.getByRole("button", { name: "Ziua următoare" }).click();
  const [first, second] = data.demo.bookings;
  const moved = page.getByRole("group", { name: first!.court }).getByRole("button", { name: new RegExp(first!.organizer) });
  await expect(moved).toBeVisible();
  await expect(page.getByRole("group", { name: second!.court }).getByRole("button", { name: new RegExp(second!.organizer) })).toBeVisible();
  await expectAccessible(page);
  await shot(page, "03-calendar");

  // Drag and drop onto another court, at 14:00 club time; the move asks for a reason.
  const target = data.demo.courts[2]!;
  await moved.dragTo(page.getByRole("button", { name: `${target}, 14:00` }));
  const confirm = page.getByRole("region", { name: "Mut rezervarea" });
  await expect(confirm.getByText(`${first!.organizer} → ${target}, ora 14:00`)).toBeVisible();
  await confirm.getByRole("button", { name: "Mut rezervarea" }).click();
  await confirm.getByLabel("Motivul").fill("clientul a cerut altă oră");
  await confirm.getByRole("button", { name: "Mut rezervarea" }).click();
  await expect(page.getByText("Rezervarea a fost mutată.")).toBeVisible();
  const there = page.getByRole("group", { name: target }).getByRole("button", { name: new RegExp(first!.organizer) });
  await expect(there).toContainText("14:00–15:30");

  // A move onto a taken slot is refused by the server (R-043) with a readable message.
  await there.click();
  const details = page.getByRole("region", { name: "Detaliile rezervării" });
  await details.getByRole("button", { name: "Mut rezervarea" }).click();
  await details.getByLabel("Resursa").selectOption({ label: second!.court });
  await details.getByLabel("Ora de început").selectOption({ label: "12:00" });
  await details.getByLabel("Motivul").fill("încercare");
  await details.getByRole("button", { name: "Mut rezervarea" }).click();
  await expect(page.getByRole("alert")).toContainText("Intervalul ales tocmai a fost rezervat");
  await details.getByRole("button", { name: "Renunț" }).click();

  // A new booking on a free cell, for a customer found by name; then cancelled with a reason.
  await page.getByRole("button", { name: `${data.demo.courts[3]}, 18:00` }).click();
  const form = page.getByRole("form", { name: "Rezervare nouă" });
  await form.getByLabel("Clientul").fill("rares.mosteanu@demo.invalid");
  await form.getByRole("button", { name: "Găsește" }).click();
  await form.getByRole("button", { name: "Moșteanu Rareș · rares.mosteanu@demo.invalid" }).click();
  await form.getByRole("button", { name: "Rezerv" }).click();
  await expect(page.getByText(/Rezervarea a fost făcută/)).toBeVisible();
  const made = page.getByRole("group", { name: data.demo.courts[3]! }).getByRole("button", { name: /18:00–19:30.*Rareș Moșteanu/ });
  await expect(made).toContainText("18:00–19:30");
  await made.click();
  await details.getByRole("button", { name: "Anulez rezervarea" }).click();
  await details.getByLabel("Motivul").fill("clientul s-a răzgândit");
  await details.getByRole("button", { name: "Anulez rezervarea" }).click();
  await expect(page.getByText("Rezervarea a fost anulată.")).toBeVisible();
  await expect(made).toHaveCount(0);
  await shot(page, "04-calendar-dupa-mutare");

  await page.getByRole("button", { name: "Ieșire" }).click();
  await expect(page.getByRole("heading", { name: "Administrare Jungle Padel" })).toBeVisible();
});

test("the administrator signs in with the authenticator code and checks the rest", async ({ page }) => {
  const used = new Set<string>();
  await credentials(page, data.admin.email, data.admin.password);
  await page.getByLabel("Codul din aplicația de autentificare").fill("000000");
  await page.getByRole("button", { name: "Intră" }).click();
  await expect(page.getByRole("alert")).toBeVisible(); // a wrong code is refused
  await page.getByLabel("Codul din aplicația de autentificare").fill(await freshCode(data.admin.secret, used));
  await page.getByRole("button", { name: "Intră" }).click();
  await expect(page.getByRole("heading", { name: "Tablou de bord" })).toBeVisible();
  const menu = page.getByRole("navigation", { name: "Modulele panoului" });
  await expect(menu.getByRole("link", { name: /Asistentul AI · Etapa 12/ })).toBeVisible();

  await go(page, "Jurnalul de audit");
  await page.getByLabel("Acțiunea").fill("booking.moved");
  await page.getByRole("button", { name: "Caută" }).click();
  await expect(page.getByText("Motiv: clientul a cerut altă oră")).toBeVisible();
  await expectAccessible(page);
  await shot(page, "05-jurnal-audit");

  await go(page, "Liga");
  await expect(page.getByText(/Scorurile se introduc și se confirmă doar la Chioșcul de Ligă/)).toBeVisible();
  await expect(page.getByRole("spinbutton")).toHaveCount(0); // no score field anywhere (invariant 1)
  await expectAccessible(page);

  await go(page, "Rapoarte și exporturi");
  await expect(page.getByRole("heading", { name: "Venituri pe categorii" })).toBeVisible();
  const href = await page.getByRole("link", { name: /Export rezervări/ }).getAttribute("href");
  const csv = await page.request.get(href ?? "");
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(await csv.text()).toContain("date,start,end,resource,type,status,organizer,price_ron");
  await expectAccessible(page);
  await shot(page, "06-rapoarte");

  await go(page, "Setări și feature flags");
  await expect(page.getByRole("heading", { name: "Ce mai trebuie confirmat" })).toBeVisible();
  await expect(page.getByRole("row", { name: /parkour/ })).toContainText("Oprit"); // hidden at the launch
  await expectAccessible(page);
  await shot(page, "07-setari");

  await go(page, "Starea sistemului");
  await expect(page.getByText("Europe/Bucharest", { exact: false })).toBeVisible();
  await expect(page.getByText("OK").first()).toBeVisible();
  await expectAccessible(page);
  await shot(page, "08-stare-sistem");

  // Another language, the same panel.
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("navigation", { name: "Panel modules" }).getByRole("link", { name: "Bookings calendar" })).toBeVisible();
});

test("without a session the API refuses the panel's reads", async ({ request }) => {
  const refused = await request.get(`/api/v1/staff/panel/permissions`);
  expect(refused.status()).toBe(401);
});
