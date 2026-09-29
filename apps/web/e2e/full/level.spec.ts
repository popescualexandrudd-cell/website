/**
 * The full site, section 6 (§9.2.6, Stage 11): the simulator "Care e nivelul tău?". Questions on
 * pills, the level from the real API with the official questionnaire's formula (R-003, Q47), where
 * to start, and the answers ready for the official questionnaire; the keyboard, a failed request,
 * reduced motion and English.
 */
import { expect, type Locator, type Page, test } from "@playwright/test";
import { chooseNecessaryCookies, expectAccessible } from "../helpers";

async function shot(page: Page, name: string, project: string) {
  const dir = process.env.E2E_SCREENSHOTS;
  if (dir) await page.screenshot({ path: `${dir}/${project}-${name}.png` });
}

async function open(page: Page, locale = "ro", title = "Care e nivelul tău?"): Promise<Locator> {
  await page.goto(`/${locale}`);
  const simulator = page.getByRole("region", { name: title });
  await simulator.scrollIntoViewIfNeeded();
  return simulator;
}

/** Answers a question: the heading is the question, the pills are its group. */
async function pick(simulator: Locator, question: string, answer: string) {
  await expect(simulator.getByRole("heading", { level: 3, name: question })).toBeVisible();
  await simulator.getByRole("group", { name: question }).getByRole("button", { name: answer, exact: answer.length < 4 }).click();
}

test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

test("§9.2.6, R-003: six questions, the level from the server, where to start, the official questionnaire pre-filled", async ({
  page,
}, info) => {
  const simulator = await open(page);
  await expect(simulator.getByText("Întrebarea 1 din 6")).toBeVisible();
  await pick(simulator, "De cât timp joci padel?", "Între 1 și 3 ani");
  await expect(simulator.getByRole("heading", { level: 3, name: "Ce descrie cel mai bine jocul tău?" })).toBeFocused();
  await expect(simulator.getByText("Întrebarea 2 din 6")).toBeVisible();
  await expectAccessible(page);
  await shot(page, "07-nivel-intrebare", info.project.name);
  await pick(simulator, "Ce descrie cel mai bine jocul tău?", "Joc din perete");
  await pick(simulator, "Ai jucat turnee de padel?", "Nu");
  await pick(simulator, "Ai jucat tenis sau alt sport cu rachetă?", "Da, din plăcere");
  await pick(simulator, "Cât de des joci acum?", "O dată pe săptămână");
  await pick(simulator, "Ce îți dorești acum?", "Să intru în ligă");

  // Q47 on the pre-filled questionnaire: band 3.5 (a year or more, weekly), its middle, 3.75.
  await expect(simulator.getByRole("heading", { level: 3, name: "Nivelul tău estimat" })).toBeFocused();
  await expect(simulator.locator(".level__number")).toHaveText("3,75");
  await expect(simulator.locator(".level__band")).toHaveText("Intermediar bun");
  await expect(simulator.getByRole("heading", { level: 5 })).toHaveText(["Liga Jungle"]);
  await expect(simulator.getByText(/pentru adulți \(18\+\)/)).toBeVisible();
  await expect(simulator.getByRole("link", { name: "Vezi liga" })).toHaveAttribute("href", "/ro/liga");
  await expect(simulator.getByRole("link", { name: "Continuă cu chestionarul oficial." })).toHaveAttribute(
    "href",
    "/ro/cont?band=3.5&years_playing=1&racket_background=recreational&tournaments=none",
  );
  await expectAccessible(page);
  await shot(page, "08-nivel-rezultat", info.project.name);

  // Back to the last question, the answer given is marked; another goal, another recommendation.
  await simulator.getByRole("button", { name: "Înapoi" }).click();
  const goal = simulator.getByRole("group", { name: "Ce îți dorești acum?" });
  await expect(goal.getByRole("button", { name: "Să intru în ligă" })).toHaveAttribute("aria-pressed", "true");
  await goal.getByRole("button", { name: "Să învăț și să progresez" }).click();
  await expect(simulator.getByRole("heading", { level: 5 })).toHaveText(["Lecții cu antrenor"]);
  await simulator.getByRole("button", { name: "Reia de la început" }).click();
  await expect(simulator.getByText("Întrebarea 1 din 6")).toBeVisible();
  await expect(simulator.getByRole("heading", { level: 3, name: "De cât timp joci padel?" })).toBeFocused();
});

test("with the keyboard, someone who never played answers three questions and starts with a lesson", async ({ page }) => {
  const simulator = await open(page);
  await simulator.getByRole("button", { name: "Încă n-am jucat" }).focus();
  await page.keyboard.press("Enter");
  await expect(simulator.getByRole("heading", { level: 3, name: "Ai jucat tenis sau alt sport cu rachetă?" })).toBeFocused();
  await expect(simulator.getByText("Întrebarea 2 din 3")).toBeVisible();
  await page.keyboard.press("Tab"); // the first pill: "Nu"
  await page.keyboard.press("Enter");
  await expect(simulator.getByRole("heading", { level: 3, name: "Ce îți dorești acum?" })).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab"); // "Să joc cu alții, din plăcere"
  await page.keyboard.press("Enter");

  await expect(simulator.locator(".level__number")).toHaveText("1,0");
  await expect(simulator.locator(".level__band")).toHaveText("Începător absolut");
  await expect(simulator.getByRole("heading", { level: 5 })).toHaveText(["O lecție de inițiere", "Meciuri deschise"]);
  await expect(simulator.getByRole("link", { name: "Programează o lecție" })).toHaveAttribute("href", "/ro/rezervari");
  await expect(simulator.getByRole("link", { name: "Continuă cu chestionarul oficial." })).toHaveAttribute(
    "href",
    "/ro/cont?band=1.0&years_playing=0&racket_background=none&tournaments=none",
  );
});

test("when the server does not answer, a message and a new try", async ({ page }) => {
  await page.route("**/api/v1/league/level-guess**", (route) => route.abort());
  const simulator = await open(page);
  await pick(simulator, "De cât timp joci padel?", "Încă n-am jucat");
  await pick(simulator, "Ai jucat tenis sau alt sport cu rachetă?", "Da, la competiții");
  await pick(simulator, "Ce îți dorești acum?", "Să intru în ligă");
  await expect(simulator.getByText("Nu putem calcula nivelul acum. Încearcă din nou în câteva momente.")).toBeVisible();
  await expect(simulator.locator(".level__card")).toHaveAttribute("aria-busy", "false");

  await page.unroute("**/api/v1/league/level-guess**");
  await simulator.getByRole("button", { name: "Încearcă din nou" }).click();
  await expect(simulator.locator(".level__number")).toHaveText("1,25");
  await expect(simulator.getByRole("heading", { level: 5 })).toHaveText(["O lecție de inițiere", "Liga Jungle"]);
});

test("the ball rallies at every answer, and stays still with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" }); // the mobile project starts reduced
  const simulator = await open(page);
  const ball = simulator.locator(".level__ball");
  await pick(simulator, "De cât timp joci padel?", "De mai puțin de un an");
  await expect.poll(() => ball.evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await pick(simulator, "Ce descrie cel mai bine jocul tău?", "Primii pași");
  await page.waitForTimeout(100);
  expect(await ball.evaluate((el) => el.getAnimations().length)).toBe(0);
});

test("in English", async ({ page }) => {
  const simulator = await open(page, "en", "What's your level?");
  await pick(simulator, "How long have you been playing padel?", "I haven't played yet");
  await pick(simulator, "Have you played tennis or another racket sport?", "No");
  await pick(simulator, "What do you want now?", "To learn and improve");
  await expect(simulator.locator(".level__number")).toHaveText("1.0");
  await expect(simulator.locator(".level__band")).toHaveText("Complete beginner");
  await expect(simulator.getByRole("link", { name: "Book a lesson" })).toHaveAttribute("href", "/en/bookings");
  await expect(simulator.getByRole("link", { name: "Continue with the official questionnaire." })).toHaveAttribute(
    "href",
    /^\/en\/account\?band=1\.0&/,
  );
});
