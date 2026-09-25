import { expect, test } from "@playwright/test";

test("pagina principală: deschiderea, campania, grupele, programele și echipa", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Experiență de elită/i);
  // The opening shows the club's video, its photograph, or the frame saying what to upload.
  await expect(page.locator(".hero .hero-media > *").first()).toBeVisible();

  // The winter campaign, right under the opening.
  const campaign = page.locator("#campanie");
  await expect(campaign).toContainText("Campania de iarnă la Clubul Tenis Elite!");
  await expect(campaign).toContainText("60 RON/oră");
  await expect(campaign).toContainText("2 ședințe GRATUITE");

  // The groups' stages, from the red ball to the yellow one, and the six programmes.
  await expect(page.locator("#academia .stage")).toHaveCount(4);
  await expect(page.locator("#programe .program-slab")).toHaveCount(6);

  // Every coach card leads to the coach's own page.
  const card = page.locator("#echipa .coach-card-link").first();
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("href", /\/echipa\/[a-z0-9-]+$/);

  // No 3D scene anywhere.
  await expect(page.locator("canvas")).toHaveCount(0);
});

test("echipa: lista antrenorilor și pagina fiecăruia", async ({ page }) => {
  await page.goto("/echipa");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Antrenorii clubului/i);
  const first = page.locator(".coach-card-link").first();
  const name = (await first.locator(".coach-card-name").textContent())?.trim() ?? "";
  await first.click();
  await expect(page).toHaveURL(/\/echipa\/[a-z0-9-]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page.getByRole("heading", { name: "Parcurs" })).toBeVisible();
});
