import { expect, test } from "@playwright/test";
import { newVisitor, run, waitForEmail } from "./helpers";

test("formularul de contact trimite mesajul și anunță antrenorul", async ({ browser }) => {
  const context = await newVisitor(browser);
  const page = await context.newPage();
  await page.goto("/contact");
  const form = page.locator("form").filter({ has: page.locator('textarea[name="message"]') });
  const name = `Vizitator ${run}`;

  // First without consent: the error is explained and what was typed stays in the form.
  await form.getByLabel("Nume").fill(name);
  await form.getByLabel("Email").fill(`vizitator-${run}@example.com`);
  await form.getByLabel("Mesaj").fill("Aș vrea să aflu programul grupelor pentru copii de 8 ani.");
  await form.getByRole("button", { name: "Trimite mesajul" }).click();
  await expect(form.getByText("Bifează acordul ca să putem continua.")).toBeVisible();
  await expect(form.getByLabel("Mesaj")).toHaveValue(/programul grupelor/);

  await form.locator('input[name="consent"]').check();
  await form.getByRole("button", { name: "Trimite mesajul" }).click();
  await expect(page.getByText("Mesajul e trimis.", { exact: false })).toBeVisible();

  await waitForEmail(
    process.env.COACH_NOTIFY_EMAIL ?? "antrenor@example.com",
    new RegExp(`Mesaj nou de la ${name}`),
  );
  await context.close();
});

test("autentificarea cu parolă greșită e refuzată", async ({ browser }) => {
  const context = await newVisitor(browser);
  const page = await context.newPage();
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(`nimeni-${run}@example.com`);
  await page.getByLabel("Parola").fill("o-parola-gresita-123");
  await page.getByRole("button", { name: /Intră/ }).click();
  await expect(
    page.getByText("Emailul sau parola nu sunt corecte.", { exact: false }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login/);

  // The admin stays closed without a session.
  await page.goto("/admin/rezervari");
  await expect(page).toHaveURL(/\/admin\/login/);
  await context.close();
});
