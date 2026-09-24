import { expect, test } from "@playwright/test";

test("pagina principală: titlul, secțiunea personală și laboratorul tehnic", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /Lecții de tenis pentru copii și adulți/i,
  );
  await expect(page.locator("#antrenorul .coach-portrait")).toBeVisible();

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
  await expect(lab.getByRole("button", { name: /Poziția „trofeu”/ })).toHaveAttribute(
    "aria-current",
    "step",
  );
});

test("fără WebGL, pagina rămâne completă: afișul terenului și textele fazelor", async ({
  browser,
}) => {
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
  await expect(page.locator(".hero .court3d")).toHaveAttribute("data-status", "unavailable");
  await expect(page.locator(".hero .court3d-poster svg")).toBeVisible();
  await expect(page.locator(".lab-phase-title")).not.toBeEmpty();
  await context.close();
});
