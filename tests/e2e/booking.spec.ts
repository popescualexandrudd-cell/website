import { expect, test } from "@playwright/test";
import { fillBookingDetails, loginAsAdmin, newVisitor, run, waitForEmail } from "./helpers";

const SUBMIT = "Trimite rezervarea";
const DONE = "Rezervarea a fost trimisă.";

test("pașii se parcurg în ordine: program, antrenament și durată, apoi orele libere", async ({
  browser,
}) => {
  const context = await newVisitor(browser);
  const page = await context.newPage();
  await page.goto("/rezervare");
  const flow = page.locator(".booking-flow");

  // Step 1: the programmes booked online (camps and team building are arranged by phone),
  // and a clear message when none is chosen.
  await expect(flow.locator(".booking-option-name")).toHaveText([
    "Inițiere",
    "Competiție",
    "Înaltă performanță",
    "Amatori",
  ]);
  await flow.getByRole("button", { name: "Continuă" }).click();
  await expect(flow.getByText("Alege unul dintre programe")).toBeVisible();
  await flow.getByLabel(/Amatori/).check();
  await flow.getByRole("button", { name: "Continuă" }).click();

  // Step 2: the kinds of session and the duration dropdown.
  await expect(flow.getByRole("heading", { name: "Ce fel de antrenament vrei?" })).toBeVisible();
  await flow.getByLabel(/Antrenament individual/).check();
  const duration = flow.getByLabel("Durata antrenamentului");
  await expect(duration.locator("option")).toHaveText([
    /60 de minute/,
    /90 de minute/,
    /120 de minute/,
  ]);
  await duration.selectOption("120");
  await flow.getByRole("button", { name: "Continuă" }).click();

  // Step 3: every free time lasts the chosen two hours.
  await expect(flow.getByRole("heading", { name: "Alege ziua și ora" })).toBeVisible();
  const first = flow.locator(".slot").first();
  await expect(first).toBeVisible();
  const [from, to] = (await first.innerText()).split("–").map((t) => t.trim());
  const minutes = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));
  expect(minutes(to!) - minutes(from!)).toBe(120);

  // Step 4 follows the click, with the choice summarised.
  await first.click();
  await expect(flow.getByRole("heading", { name: "Datele mele" })).toBeVisible();
  await expect(flow.getByText(/Antrenament individual, 120 de minute/)).toBeVisible();
  await flow.getByRole("button", { name: "Verifică și trimite" }).click();
  await expect(flow.getByText("Completează câmpurile marcate")).toBeVisible();
  await context.close();
});

test("widgetul de pe prima pagină duce direct la „Datele mele”", async ({ browser }) => {
  const context = await newVisitor(browser);
  const page = await context.newPage();
  await page.goto("/");
  const card = page.locator("#rezervare .booking-card");
  await card.scrollIntoViewIfNeeded();
  await card.getByLabel("Programul").selectOption({ label: "Inițiere" });
  await card
    .getByLabel(/^Antrenamentul/)
    .selectOption({ label: "Antrenament în 2" });
  await card.getByLabel("Durata antrenamentului").selectOption("90");
  const slot = card.locator(".slot").first();
  await expect(slot).toBeVisible();
  await slot.click();
  await expect(page).toHaveURL(/\/rezervare\?.*tip=antrenament-in-2/);
  const flow = page.locator(".booking-flow");
  await expect(flow.getByRole("heading", { name: "Datele mele" })).toBeVisible();
  await expect(flow.getByText(/Antrenament în 2, 90 de minute/)).toBeVisible();
  await context.close();
});

test.describe.serial("rezervare de la cap la coadă", () => {
  const email = `client-${run}@example.com`;
  let code = "";
  let manageUrl = "";

  test("clientul rezervă un antrenament; el și antrenorul primesc emailul", async ({ browser }) => {
    const context = await newVisitor(browser);
    const page = await context.newPage();
    await page.goto("/rezervare?program=initiere&tip=antrenament-individual&durata=90");
    // The last interval shown is several days away, so it can still be cancelled free of charge.
    await page.locator(".slot").last().click();
    await fillBookingDetails(page, { name: "Client E2E", email });
    const review = page.locator(".booking-review");
    await expect(review).toContainText("Inițiere");
    await expect(review).toContainText("Antrenament individual");
    await expect(review).toContainText("90 de minute");
    await page.getByRole("button", { name: SUBMIT }).click();

    const done = page.locator(".booking-done");
    await expect(done).toContainText(DONE);
    await expect(done).toContainText(email);
    code = (await done.innerText()).match(/TN-[A-Z0-9]{6}/)?.[0] ?? "";
    expect(code).not.toBe("");
    manageUrl = (await done.getByRole("link").first().getAttribute("href")) ?? "";
    expect(manageUrl).toContain("/rezervare/");

    await waitForEmail(email, new RegExp(`Am primit cererea de rezervare \\(${code}\\)`));
    // The coach's notification goes to COACH_NOTIFY_EMAIL or, when empty, to the site's email.
    await waitForEmail(null, new RegExp(`Rezervare nouă ${code}`));
    await context.close();
  });

  test("antrenorul confirmă din admin; clientul primește confirmarea cu .ics", async ({
    browser,
  }) => {
    const context = await newVisitor(browser);
    const page = await context.newPage();
    await loginAsAdmin(page);
    await page.goto(`/admin/rezervari?q=${code}`);
    await page
      .getByRole("link", { name: /Client E2E/ })
      .first()
      .click();
    await expect(page.locator(".status")).toHaveText("în așteptare");
    await expect(page.getByText("90 de minute")).toBeVisible();
    await page.getByRole("button", { name: "Confirmă rezervarea" }).click();
    await expect(page.getByText(/Rezervarea e confirmată/)).toBeVisible();

    const message = await waitForEmail(
      email,
      new RegExp(`Antrenamentul e confirmat \\(${code}\\)`),
    );
    expect(message.Attachments).toBeGreaterThan(0);
    await context.close();
  });

  test("clientul anulează prin linkul din email", async ({ browser }) => {
    const context = await newVisitor(browser);
    const page = await context.newPage();
    page.on("dialog", (dialog) => void dialog.accept());
    await page.goto(manageUrl);
    await expect(page.getByRole("heading", { name: new RegExp(code) })).toBeVisible();
    await page.getByRole("button", { name: "Anulează rezervarea" }).click();
    await expect(page.getByText("Rezervarea e anulată.", { exact: false })).toBeVisible();
    await context.close();
  });
});

test("două rezervări simultane pe același interval: doar una reușește", async ({ browser }) => {
  const [first, second] = await Promise.all([newVisitor(browser), newVisitor(browser)]);
  const pages = await Promise.all([first.newPage(), second.newPage()]);
  await Promise.all(
    pages.map((page) =>
      page.goto("/rezervare?program=amatori&tip=antrenament-individual&durata=60"),
    ),
  );

  // Both visitors pick the same (first free) interval.
  const label = await pages[0]!.locator(".slot").first().innerText();
  for (const [index, page] of pages.entries()) {
    await page.locator(".slot").filter({ hasText: label }).first().click();
    await fillBookingDetails(page, {
      name: `Simultan ${index + 1}`,
      email: `simultan-${index}-${run}@example.com`,
    });
  }
  await Promise.all(pages.map((page) => page.getByRole("button", { name: SUBMIT }).click()));

  const outcomes = await Promise.all(
    pages.map(async (page) => {
      const success = page.getByText(DONE);
      // Refused either by the re-check in the transaction or by the database constraint; the
      // refused visitor is taken back to the free times with a message.
      const conflict = page.getByText(
        /Intervalul tocmai a fost ocupat|Ora aleasă nu mai e disponibilă/,
      );
      await expect(success.or(conflict)).toBeVisible({ timeout: 20_000 });
      return (await success.isVisible()) ? "rezervat" : "respins";
    }),
  );
  expect(outcomes.sort()).toEqual(["respins", "rezervat"]);
  await Promise.all([first.close(), second.close()]);
});
