import { expect, test } from "@playwright/test";
import { loginAsAdmin, newVisitor, run, waitForEmail } from "./helpers";

test("închirierea: cererea de teren ajunge în inbox și pe email", async ({ browser }) => {
  const context = await newVisitor(browser);
  const page = await context.newPage();
  await page.goto("/inchiriere-teren");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Închiriere/i);
  await expect(page.locator("#program").getByText("08:00–01:00")).toBeVisible();

  const form = page.locator("#cerere form");
  const name = `Jucător ${run}`;
  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  await form.getByLabel("Ziua").fill(tomorrow);
  await form.getByLabel("Ora de început").selectOption("19:00");
  await form.getByLabel("Durata").selectOption("90");
  await form.getByLabel("Terenul").selectOption("acoperit");
  await form.getByLabel("Nume").fill(name);
  await form.getByLabel("Telefon").fill("0722 123 456");
  await form.getByLabel("Email").fill(`teren-${run}@example.com`);
  await form.locator('input[name="consent"]').check();
  await form.getByRole("button", { name: "Trimite cererea" }).click();
  await expect(page.getByText("Am primit cererea.", { exact: false })).toBeVisible();

  await waitForEmail(
    process.env.COACH_NOTIFY_EMAIL ?? "antrenor@example.com",
    new RegExp(`Cerere de teren: ${name}`),
  );
  const admin = await browser.newPage();
  await loginAsAdmin(admin);
  await admin.goto("/admin/mesaje");
  await expect(admin.getByText(/Închiriere teren: .*19:00, 90 de minute/).first()).toBeVisible();
  await context.close();
});

test("turneele, școlile și povestea clubului", async ({ page }) => {
  await page.goto("/turnee");
  await expect(page.getByRole("heading", { name: "Turnee găzduite la club" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cupa Elite Pantelimon" })).toBeVisible();

  await page.goto("/scoli-gradinite");
  await expect(page.getByText("Peste 10 ani de parteneriate")).toBeVisible();
  await page.locator("#parteneriat").getByRole("link", { name: "Scrie-ne" }).click();
  await expect(page).toHaveURL(/\/contact\?subiect=/);
  await expect(page.getByLabel("Subiect (opțional)")).toHaveValue(
    "Parteneriat școală sau grădiniță",
  );

  await page.goto("/");
  await expect(page.locator("#poveste .story-step")).toHaveCount(5);
  await expect(page.locator("#piloni .pillar-card")).toHaveCount(4);
  await page.getByRole("radio", { name: "Pentru mine (adult)" }).check();
  await page.getByRole("radio", { name: "Deloc", exact: true }).check();
  await page.getByRole("radio", { name: "Mișcare și distracție" }).check();
  await expect(page.locator(".finder-result-title")).toHaveText(/Inițiere/i);
});
