/**
 * The club's assistant (Stage 12D, ADR-0019), with the AI switched on and the scripted provider of
 * the end-to-end tests (AI_FAKE: not an AI, a fixed script through the club's real tools). A visitor
 * asks the hours; a signed-in client gets a booking prepared, and books it with the button.
 */
import { expect, test } from "@playwright/test";
import { chooseNecessaryCookies, expectAccessible } from "../helpers";

const EMAIL = process.env.E2E_ASSISTANT_EMAIL ?? "";
const PASSWORD = process.env.E2E_ASSISTANT_PASSWORD ?? "";

test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

test("ADR-0019: a visitor asks the hours; the assistant says it is an AI that can make mistakes", async ({ page }) => {
  await page.goto("/ro");
  const open = page.getByRole("button", { name: "Întreabă clubul" });
  await open.click();
  const panel = page.getByRole("dialog", { name: "Asistentul clubului" });
  await expect(panel.getByText(/Asistent AI: poate greși/)).toBeVisible();
  const question = panel.getByLabel("Întrebarea ta");
  await expect(question).toBeFocused();
  await question.fill("Care e programul clubului?");
  await question.press("Enter");
  await expect(panel.getByText("Clubul e deschis de luni până vineri 08:00–23:00, iar în weekend 08:00–23:00.")).toBeVisible();
  await expectAccessible(page);
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(open).toBeFocused();
});

test("ADR-0019, R-063: a signed-in client gets a booking prepared and books it with the button", async ({ page }) => {
  test.skip(!EMAIL, "needs E2E_ASSISTANT_EMAIL from scripts/test-e2e");
  await page.goto("/ro/cont");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Parola").fill(PASSWORD);
  await page.getByRole("button", { name: "Intră" }).click();
  await expect(page.getByRole("button", { name: "Ieși din cont" })).toBeVisible();

  await page.getByRole("button", { name: "Întreabă clubul" }).click();
  const panel = page.getByRole("dialog", { name: "Asistentul clubului" });
  await panel.getByLabel("Întrebarea ta").fill("Vreau să rezerv un teren mâine");
  await panel.getByRole("button", { name: "Trimite" }).click();
  await expect(panel.getByText(/Am pregătit rezervarea:/)).toBeVisible();
  await expect(panel.getByText(/90 de minute: /)).toBeVisible();
  await panel.getByRole("button", { name: "Rezervă" }).click();
  await expect(panel.getByRole("status")).toHaveText("Rezervat. Îl găsești în cont; plata se face la Chioșcul de Plăți.");
  await expectAccessible(page);
});

test("in English, the button and the notice", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("button", { name: "Ask the club" }).click();
  await expect(page.getByRole("dialog", { name: "The club's assistant" }).getByText(/AI assistant: it can make mistakes/)).toBeVisible();
});
