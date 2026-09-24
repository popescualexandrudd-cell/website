import { expect, test } from "@playwright/test";
import { fillBookingDetails, loginAsAdmin, newVisitor, run, waitForEmail } from "./helpers";

test.describe.serial("rezervare de la cap la coadă", () => {
  const email = `client-${run}@example.com`;
  let code = "";
  let manageUrl = "";

  test("clientul rezervă o lecție și primește emailul", async ({ browser }) => {
    const context = await newVisitor(browser);
    const page = await context.newPage();
    await page.goto("/rezervare?program=lectie-individuala");
    // The last interval shown is several days away, so it can still be cancelled free of charge.
    await page.locator(".slot").last().click();
    await fillBookingDetails(page, { name: "Client E2E", email });
    await page.getByRole("button", { name: "Trimite cererea de rezervare" }).click();

    const done = page.locator(".booking-done");
    await expect(done).toContainText("Cererea de rezervare e trimisă.");
    code = (await done.innerText()).match(/TN-[A-Z0-9]{6}/)?.[0] ?? "";
    expect(code).not.toBe("");
    manageUrl = (await done.getByRole("link").first().getAttribute("href")) ?? "";
    expect(manageUrl).toContain("/rezervare/");

    await waitForEmail(email, new RegExp(`Am primit cererea de rezervare \\(${code}\\)`));
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
    await page.getByRole("button", { name: "Confirmă rezervarea" }).click();
    await expect(page.getByText(/Rezervarea e confirmată/)).toBeVisible();

    const message = await waitForEmail(email, new RegExp(`Lecția e confirmată \\(${code}\\)`));
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
  await Promise.all(pages.map((page) => page.goto("/rezervare?program=lectie-individuala")));

  // Both visitors pick the same (first free) interval.
  const label = await pages[0]!.locator(".slot").first().innerText();
  for (const [index, page] of pages.entries()) {
    await page.locator(".slot").filter({ hasText: label }).first().click();
    await fillBookingDetails(page, {
      name: `Simultan ${index + 1}`,
      email: `simultan-${index}-${run}@example.com`,
    });
  }
  await Promise.all(
    pages.map((page) => page.getByRole("button", { name: "Trimite cererea de rezervare" }).click()),
  );

  const outcomes = await Promise.all(
    pages.map(async (page) => {
      const success = page.getByText("Cererea de rezervare e trimisă.");
      // Refused either by the re-check in the transaction or by the database constraint.
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
