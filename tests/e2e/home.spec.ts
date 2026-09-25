import { expect, test } from "@playwright/test";

test("pagina principală: deschiderea, academia, echipa și laboratorul tehnic", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Învață/i);
  // The opening shows the club's video, its photograph, or the frame saying what to upload.
  await expect(page.locator(".hero .hero-media > *").first()).toBeVisible();

  // The junior academy's stages, from the red ball to the yellow one.
  await expect(page.locator("#academia .stage")).toHaveCount(4);

  // Every coach card leads to the coach's own page.
  const card = page.locator("#echipa .coach-card-link").first();
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("href", /\/echipa\/[a-z0-9-]+$/);

  // The lab's phases are plain buttons: they work with or without the 3D scene.
  const lab = page.locator(".lab");
  await lab.scrollIntoViewIfNeeded();
  await lab.getByRole("button", { name: "Serviciu" }).click();
  await expect(lab.getByRole("button", { name: "Serviciu" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await lab.getByRole("button", { name: /Poziția „trofeu”/ }).click();
  await expect(lab.locator(".lab-phase-title")).toHaveText("Poziția „trofeu”");
});

test("fără WebGL, laboratorul rămâne complet: afișul și textele fazelor", async ({ browser }) => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type === "webgl2" || type === "webgl") return null;
      return (original as (...a: unknown[]) => unknown).call(this, type, ...args);
    } as typeof original;
  });
  const page = await context.newPage();
  await page.goto("/");
  const lab = page.locator(".lab");
  await lab.scrollIntoViewIfNeeded();
  await expect(lab.locator(".court3d")).toHaveAttribute("data-status", "unavailable");
  await expect(page.locator(".lab-phase-title")).not.toBeEmpty();
  await context.close();
});

test("echipa: lista antrenorilor și pagina fiecăruia", async ({ page }) => {
  await page.goto("/echipa");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Echipa/i);
  const first = page.locator(".coach-card-link").first();
  const name = (await first.locator(".coach-card-name").textContent())?.trim() ?? "";
  await first.click();
  await expect(page).toHaveURL(/\/echipa\/[a-z0-9-]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page.getByRole("heading", { name: "Formare și certificări" })).toBeVisible();
});
