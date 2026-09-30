/**
 * The account (§9.3 `/cont`, ADR-0011): creating an account with only the data the club needs and
 * the current Terms and Privacy policy (R-001, §12.3), confirming the email from the real email,
 * signing out and in, a new password from the real email, and the refusals the server decides
 * (wrong password; under 14, Q43). Registrations are limited per address (10 an hour), so each
 * device makes one.
 */
import { expect, type Page, test } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chooseNecessaryCookies, expectAccessible } from "../helpers";

const MAIL_DIR = process.env.E2E_MAIL_DIR ?? "";
const PASSWORD = "Padel-Jungle-2027!";

async function shot(page: Page, name: string, project: string) {
  const dir = process.env.E2E_SCREENSHOTS;
  if (dir) await page.screenshot({ path: `${dir}/${project}-${name}.png` });
}

/** The newest link to `path` in the emails sent to `to` (quoted-printable soft breaks undone). */
function latestLink(to: string, path: string): string {
  const bodies = readdirSync(MAIL_DIR)
    .map((f) => readFileSync(join(MAIL_DIR, f), "utf8"))
    .filter((b) => b.includes(`To: ${to}`))
    .map((b) => b.replace(/=\r?\n/g, "").replace(/=3D/g, "="));
  const match = (bodies.at(-1) ?? "").match(new RegExp(`(https?://[^\\s"<]*${path.replace(/\//g, "\\/")}\\?[^\\s"<]+)`));
  if (!match?.[1]) throw new Error(`no ${path} link for ${to}`);
  return match[1].replace(/&amp;/g, "&");
}

const birthYearsAgo = (years: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
};

test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

test("R-001, §12.3: create an account, confirm the email, sign out and in, a new password", async ({ page }, info) => {
  test.skip(!MAIL_DIR, "needs E2E_MAIL_DIR from scripts/test-e2e");
  const email = `cont-${info.project.name}-${process.env.E2E_SITE_MODE ?? "x"}-${Date.now()}@example.test`;
  await page.goto("/ro/cont/inregistrare");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Creează cont");
  await page.getByLabel("Prenume").fill("Ana");
  await page.getByLabel("Nume", { exact: true }).fill("Test");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Telefon").fill("0722 000 111");
  await page.getByLabel("Data nașterii").fill(birthYearsAgo(30));
  await page.getByLabel("Parola").fill(PASSWORD);
  const submit = page.getByRole("button", { name: "Creează contul" });
  await expect(submit).toBeDisabled(); // the documents must be accepted first
  await page.getByRole("checkbox").check();
  await expectAccessible(page);
  await shot(page, "50-cont-inregistrare", info.project.name);
  await submit.click();
  await expect(page.getByRole("status")).toContainText(`Ți-am trimis un email la ${email}`);

  // Signed in already; the page asks to confirm the email before booking online.
  await page.getByRole("link", { name: "Mergi la cont" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Bună, Ana!" })).toBeVisible();
  await expect(page.getByText("Confirmă adresa de email")).toBeVisible();
  await expect(page.getByText("Nu ai rezervări viitoare.")).toBeVisible();
  await expectAccessible(page);
  await shot(page, "51-cont", info.project.name);

  await page.goto(latestLink(email, "/ro/cont/verificare-email"));
  await expect(page.getByText("Adresa de email e confirmată. Acum poți rezerva online.")).toBeVisible();
  await page.getByRole("link", { name: "Mergi la cont" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Bună, Ana!" })).toBeVisible();
  await expect(page.getByText("Confirmă adresa de email")).toHaveCount(0);

  // R-040–R-043: book a court (the last day offered, the first free time), see it, cancel it.
  await page.getByRole("link", { name: "Rezervă un teren" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rezervări");
  await page.locator(".booking__days button").last().click();
  const free = page.locator(".booking__time:not([disabled])").first();
  await free.click();
  await expect(page.locator(".booking__summary .configurator__total")).toContainText("lei");
  await page.getByRole("button", { name: "Rezervă", exact: true }).click();
  await expect(page.getByText("Rezervarea e confirmată")).toBeVisible();
  await expectAccessible(page);
  await shot(page, "52-rezervare", info.project.name);
  await page.getByRole("link", { name: "Vezi rezervările din cont" }).click();
  const mine = page.getByRole("region", { name: "Rezervările tale" });
  await expect(mine.locator("li")).toHaveCount(1);
  await mine.getByRole("button", { name: "Anulează" }).click();
  await mine.getByRole("button", { name: "Da, anulez" }).click();
  await expect(page.getByText("Rezervarea e anulată, fără cost.")).toBeVisible();
  await expect(mine.getByText("Nu ai rezervări viitoare.")).toBeVisible();

  await page.getByRole("button", { name: "Ieși din cont" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Intră în cont" })).toBeVisible();

  // A wrong password: the server's refusal, translated.
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Parola").fill("not-the-password");
  await page.getByRole("button", { name: "Intră" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Emailul sau parola nu sunt corecte");

  // A new password from the email, then signing in with it.
  await page.getByRole("link", { name: "Ai uitat parola?" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Parolă nouă");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Trimite linkul" }).click();
  await expect(page.getByRole("status")).toContainText("Dacă există un cont cu această adresă");
  await expect.poll(() => {
    try {
      return latestLink(email, "/ro/cont/parola-noua");
    } catch {
      return "";
    }
  }).toContain("uid=");
  await page.goto(latestLink(email, "/ro/cont/parola-noua"));
  await page.getByLabel("Parola nouă").fill(`${PASSWORD}-2`);
  await page.getByRole("button", { name: "Salvează parola" }).click();
  await expect(page.getByRole("status")).toContainText("Parola e schimbată.");
  await page.getByRole("link", { name: "Mergi la intrarea în cont" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Intră în cont" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Parola").fill(`${PASSWORD}-2`);
  await page.getByRole("button", { name: "Intră" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Bună, Ana!" })).toBeVisible();
});

test("Q43: under 14, the account is refused and says who creates it", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one registration attempt per run (rate limit)");
  await page.goto("/ro/cont/inregistrare");
  await page.getByLabel("Prenume").fill("Mic");
  await page.getByLabel("Nume", { exact: true }).fill("Test");
  await page.getByLabel("Email").fill(`mic-${Date.now()}@example.test`);
  await page.getByLabel("Telefon").fill("0722 000 222");
  await page.getByLabel("Data nașterii").fill(birthYearsAgo(10));
  await page.getByLabel("Parola").fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Creează contul" }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("Contul pentru persoanele sub 14 ani se creează de un părinte.");
});

test("broken links from the emails say so, without asking anything", async ({ page }) => {
  await page.goto("/ro/cont/verificare-email");
  await expect(page.getByText("Linkul nu e complet.")).toBeVisible();
  await page.goto("/ro/cont/parola-noua?uid=x");
  await expect(page.getByText("Linkul nu e complet.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvează parola" })).toBeDisabled();
});

test("in English", async ({ page }) => {
  await page.goto("/en/account");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("My account");
  await expect(page.getByRole("heading", { level: 2, name: "Sign in" })).toBeVisible();
  await page.goto("/en/account/register");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Create an account");
});
