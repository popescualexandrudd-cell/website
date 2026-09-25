import { expect, test } from "@playwright/test";
import { fillBookingDetails, loginAsAdmin, newVisitor, run, waitForEmail } from "./helpers";

const COACH = process.env.COACH_NOTIFY_EMAIL ?? "antrenor@example.com";

test.describe.serial("cardul cadou: comandă, activare, rezervare cu codul", () => {
  const buyer = `cadou-${run}@example.com`;
  const recipient = `Ioana ${run}`;
  let code = "";

  test("cererea de pe site ajunge la club și la cumpărător", async ({ browser }) => {
    const context = await newVisitor(browser);
    const page = await context.newPage();
    await page.goto("/card-cadou");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Oferă un antrenament de tenis",
    );
    const form = page.locator("#comanda form");
    await form.getByRole("radio", { name: "5 antrenamente" }).check();
    await expect(page.locator(".gift-card-value")).toContainText("5 antrenamente");
    await form.getByLabel("Pentru cine e cardul").fill(recipient);
    await form.getByLabel("Numele tău").fill(`Mihai ${run}`);
    await form.getByRole("textbox", { name: /^Telefon/ }).fill("0722 123 456");
    await form.getByLabel("Emailul tău").fill(buyer);
    await form.locator('input[name="consent"]').check();
    await form.getByRole("button", { name: "Trimite cererea" }).click();
    await expect(page.getByText("Am primit cererea și te sunăm pentru plată")).toBeVisible();
    await waitForEmail(COACH, new RegExp(`Cerere de card cadou: Mihai ${run}`));
    await waitForEmail(buyer, /Am primit cererea pentru cardul cadou/);
    await context.close();
  });

  test("din admin, cardul plătit devine activ și pleacă pe email", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/continut/carduri-cadou");
    await page.getByRole("link", { name: new RegExp(recipient) }).click();
    await page.getByLabel("Starea").selectOption("ACTIVA");
    await page.getByRole("button", { name: "Salvează modificările" }).click();
    await expect(page.getByText("Modificările sunt salvate.")).toBeVisible();
    await page.reload();
    code = await page.getByLabel("Codul").inputValue();
    expect(code).toMatch(/^CADOU-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    await waitForEmail(buyer, new RegExp(`Cardul cadou pentru ${recipient}`));
  });

  test("cardul se tipărește și plătește o rezervare o singură dată", async ({ browser }) => {
    const context = await newVisitor(browser);
    const page = await context.newPage();
    await page.goto(`/card-cadou/${code}`);
    await expect(page.locator(".gift-card-print")).toContainText(recipient);
    await expect(page.locator(".gift-card-print")).toContainText(code);
    await page.getByRole("link", { name: "Rezervă cu acest card" }).click();
    await expect(page).toHaveURL(/\/rezervare\?cod=/);

    const flow = page.locator(".booking-flow");
    await flow.getByLabel(/Amatori/).check();
    await flow.getByRole("button", { name: "Continuă" }).click();
    await flow.getByLabel(/Antrenament individual/).check();
    await flow.getByRole("button", { name: "Continuă" }).click();
    await flow.locator(".slot").first().click();
    await expect(flow.getByLabel("Cod de card cadou (opțional)")).toHaveValue(code);
    await fillBookingDetails(page, { name: recipient, email: `lectie-${run}@example.com` });
    await expect(flow.getByText(code)).toBeVisible();
    await flow.getByRole("button", { name: "Trimite rezervarea" }).click();
    await expect(page.getByText("Rezervarea a fost trimisă.")).toBeVisible();

    await page.goto(`/card-cadou/${code}`);
    await expect(page.getByText("Cardul a fost deja folosit.")).toBeVisible();
    await context.close();
  });
});

test.describe.serial("liga amatorilor și partenerii de joc", () => {
  const name = `Andrei${run} Liga`;
  const shown = `Andrei${run} L.`;
  const email = `liga-${run}@example.com`;

  test("înscrierea ajunge la club, iar jucătorul apare doar după aprobare", async ({ browser }) => {
    const context = await newVisitor(browser);
    const page = await context.newPage();
    await page.goto("/partener-de-joc");
    const form = page.locator("#inscriere form");
    await form.getByRole("checkbox", { name: "Liga amatorilor" }).check();
    await form.getByRole("radio", { name: "Avansat" }).check();
    await form.getByRole("checkbox", { name: "Seara" }).check();
    await form.getByRole("textbox", { name: /^Nume/ }).fill(name);
    await form.getByRole("textbox", { name: /^Telefon/ }).fill("0722 123 456");
    await form.getByRole("textbox", { name: /^Email/ }).fill(email);
    await form.locator('input[name="consent"]').check();
    await form.getByRole("button", { name: "Trimite înscrierea" }).click();
    await expect(page.getByText("Am primit înscrierea")).toBeVisible();
    await waitForEmail(COACH, new RegExp(`Înscriere nouă .*${name}`));
    await waitForEmail(email, /Te-am înscris/);

    await page.goto("/partener-de-joc");
    await expect(page.getByText(shown)).toHaveCount(0);

    const admin = await browser.newPage();
    await loginAsAdmin(admin);
    await admin.goto("/admin/continut/jucatori");
    await admin.getByRole("link", { name: new RegExp(name) }).click();
    await admin.getByLabel("Aprobat de club").check();
    await admin.getByRole("button", { name: "Salvează modificările" }).click();
    await expect(admin.getByText("Modificările sunt salvate.")).toBeVisible();

    await page.goto("/partener-de-joc?nivel=AVANSAT");
    const card = page.locator(".partner-card", { hasText: shown }).first();
    await expect(card).toBeVisible();
    await expect(card).toContainText("seara");
    await expect(page.locator(".partner-cards")).not.toContainText(email);
    await card.getByRole("link", { name: /Vreau să joc cu/ }).click();

    const request = page.locator("#cerere form");
    await request.getByRole("textbox", { name: /^Nume/ }).fill(`Bogdan ${run}`);
    await request.getByRole("textbox", { name: /^Telefon/ }).fill("0733 123 456");
    await request.getByRole("textbox", { name: /^Email/ }).fill(`bogdan-${run}@example.com`);
    await request.locator('input[name="consent"]').check();
    await request.getByRole("button", { name: "Trimite cererea" }).click();
    await expect(page.getByText("Vorbim cu jucătorul")).toBeVisible();
    await waitForEmail(COACH, new RegExp(`Cerere de partener de joc: Bogdan ${run}`));
    await context.close();
  });

  test("pagina ligii, palmaresul și nota de pe Google", async ({ page }) => {
    await page.goto("/liga-amatori");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Liga amatorilor");
    await expect(page.locator("#inscriere form")).toBeVisible();

    await page.goto("/palmares");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Palmaresul clubului");
    await expect(page.getByRole("heading", { name: "Turnee jucate la club" })).toBeVisible();

    await page.goto("/");
    await expect(page.locator(".testimonials-rating")).toContainText("257 de recenzii pe Google");
    await expect(page.locator(".testimonial").first()).toContainText("gemene");
  });
});
