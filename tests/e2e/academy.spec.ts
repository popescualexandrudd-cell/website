import { expect, test } from "@playwright/test";
import { loginAsAdmin, newVisitor, run } from "./helpers";

test("academia de juniori: un părinte cere o evaluare și cererea ajunge în admin", async ({
  browser,
  page,
}) => {
  const visitor = await newVisitor(browser);
  const parent = await visitor.newPage();
  await parent.goto("/academie");
  await expect(parent.getByRole("heading", { level: 1 })).toContainText(/Academia de juniori/i);
  await expect(parent.locator(".group-card")).toHaveCount(4);

  await parent.getByRole("link", { name: "Cere o evaluare" }).first().click();
  const form = parent.locator("#evaluare form");
  // Sending it empty points at every missing field.
  await form.getByRole("button", { name: "Trimite cererea" }).click();
  await expect(form.getByText("Scrie prenumele copilului.")).toBeVisible();

  const childName = `Ilinca${run}`;
  await form.getByLabel("Prenumele copilului").fill(childName);
  await form.getByLabel("Vârsta copilului").fill("7");
  await form.getByLabel("Cât a jucat până acum").selectOption("putin");
  await form.getByLabel("Grupa care vi se pare potrivită").selectOption({ index: 1 });
  await form.getByLabel(/Zilele și orele/).fill("Marți sau joi după 17:00");
  await form.getByLabel("Numele părintelui").fill("Părinte Test");
  await form.getByLabel(/^Telefon/).fill("0722 123 456");
  await form.getByLabel(/^Email/).fill(`parinte-${run}@example.com`);
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Trimite cererea" }).click();
  await expect(parent.getByText(/Am primit cererea/)).toBeVisible();
  await visitor.close();

  await loginAsAdmin(page);
  await page.goto("/admin/lista-asteptare");
  const row = page.locator(".admin-row", { hasText: childName });
  await expect(row).toBeVisible();
  await expect(row).toContainText("evaluare juniori");
  await expect(row).toContainText("7 ani");
});
