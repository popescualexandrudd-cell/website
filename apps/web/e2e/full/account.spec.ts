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

test("R-001, §12.3: create an account, confirm the email, sign out and in, a new password; then the rest of the account", async ({ page }, info) => {
  test.skip(!MAIL_DIR, "needs E2E_MAIL_DIR from scripts/test-e2e");
  test.setTimeout(180_000);
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

  await memberPages(page, email, `${PASSWORD}-2`, info.project.name);
});

/**
 * The rest of the account, for the visitor made above (one registration per device): the card and a
 * lost card (R-020, R-022), money and the referral code (R-065, R-120), the league seen from the
 * inside (§6.15), the profile and the password, the export of the data and deleting the account
 * (§12.2). Every answer is the real API's.
 */
async function memberPages(page: Page, email: string, password: string, project: string) {
  const menu = page.getByRole("navigation", { name: "Contul meu" });

  await menu.getByRole("link", { name: "Cardul" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cardul de membru");
  await expect(menu.getByRole("link", { name: "Cardul" })).toHaveAttribute("aria-current", "page");
  const qr = page.getByRole("img", { name: /^Codul QR al cardului de membru / });
  await expect(qr).toBeVisible();
  const number = (await page.locator(".member-card__number").textContent()) ?? "";
  expect(number).not.toBe("");
  await expect(page.getByText("se activează după ce clubul își deschide conturile")).toBeVisible();
  await expectAccessible(page);
  await shot(page, "53-cont-card", project);
  await page.getByRole("button", { name: "Blochează cardul și fă unul nou" }).click();
  await page.getByRole("button", { name: "Da, blochează-l" }).click();
  await expect(page.getByText("Cardul vechi e blocat.")).toBeVisible();
  await expect(page.locator(".member-card__number")).not.toHaveText(number);

  await menu.getByRole("link", { name: "Plăți și abonamente" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Plăți și abonamente");
  const balance = page.getByRole("region", { name: "Soldul tău" });
  await expect(balance.getByText("Credit în cont")).toBeVisible();
  await expect(page.getByText("Nu ai niciun abonament.")).toBeVisible();
  await expect(page.getByText("Nu ai vouchere.")).toBeVisible();
  await expect(page.locator(".money__code strong")).toHaveText(/^[A-Z0-9]{4,12}$/);
  await page.getByLabel("Ai primit un cod de la un prieten?").fill("ZZZZ9999");
  await page.getByRole("button", { name: "Folosește codul" }).click();
  await expect(page.getByText("Codul de recomandare nu există.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Istoricul plăților" })).toBeVisible();
  await expectAccessible(page);
  await shot(page, "54-cont-plati", project);

  await menu.getByRole("link", { name: "Liga mea" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Liga mea");
  await expect(page.getByRole("heading", { level: 2, name: "Nu ești încă în ligă" })).toBeVisible();
  await expect(page.getByText("Acordul GDPR al ligii · se semnează la Chioșcul Ligii, în club")).toBeVisible();
  await expect(page.getByText("Nu ai semnat acordul.")).toBeVisible();
  await expect(page.getByRole("button", { name: /introdu|scor/i })).toHaveCount(0); // invariant 2: only viewing
  await expect(page.getByRole("heading", { level: 2, name: "Turneele" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Provocările tale" })).toBeVisible();
  await expect(page.getByText("Nu ai provocări.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Înscrie-te" })).toHaveCount(0); // not in the league yet
  await expectAccessible(page);
  await shot(page, "55-cont-liga", project);

  // R-110, Q34: a request for the event room; the manager answers, nothing is booked yet.
  await menu.getByRole("link", { name: "Sala de evenimente" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sala de evenimente");
  await expect(page.getByText("Nu ai trimis nicio cerere.")).toBeVisible();
  await page.getByLabel("Câte persoane").fill("500");
  await page.getByRole("button", { name: "Trimite cererea" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Sala primește cel mult");
  await page.getByLabel("Câte persoane").fill("12");
  await page.getByLabel("Despre eveniment (opțional)").fill("Aniversare");
  await page.getByRole("button", { name: "Trimite cererea" }).click();
  await expect(page.getByText("Cererea e trimisă.")).toBeVisible();
  const requests = page.getByRole("region", { name: "Cererile tale" });
  await expect(requests.locator("li")).toHaveCount(1);
  await expect(requests).toContainText("12 persoane · Așteaptă răspunsul managerului");
  await expectAccessible(page);
  await shot(page, "57-cont-evenimente", project);

  // §11: the kinds of messages; push needs the installed site (service workers are off in tests).
  await menu.getByRole("link", { name: "Notificări" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Notificări");
  await expect(page.getByText(/nu poate primi notificări de la site|nu sunt încă active la club/)).toBeVisible();
  const reminders = page.getByRole("checkbox", { name: "Memento-uri, Email" });
  await expect(reminders).toBeChecked();
  await reminders.uncheck();
  await expect(page.getByText("Alegerea e salvată.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Memento-uri, Email" })).not.toBeChecked();
  await expect(page.getByText("Mesajele despre cont, rezervări, taxe")).toBeVisible();
  await expectAccessible(page);
  await shot(page, "60-cont-notificari", project);

  await menu.getByRole("link", { name: "Profil și date" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Profil și date");
  await expect(page.getByRole("heading", { level: 2, name: "Copiii tăi" })).toHaveCount(0); // Q7: off by default
  await page.getByLabel("Telefon").fill("0722 000 333");
  await page.getByRole("button", { name: "Salvează" }).click();
  await expect(page.getByText("Datele sunt salvate.")).toBeVisible();
  await page.getByLabel("Parola de acum").fill("not-the-password");
  await page.getByLabel("Parola nouă").fill(`${password}-3`);
  await page.getByRole("button", { name: "Schimbă parola" }).click();
  await expect(page.getByText("Parola actuală nu este corectă.")).toBeVisible();
  await page.getByLabel("Parola de acum").fill(password);
  await page.getByRole("button", { name: "Schimbă parola" }).click();
  await expect(page.getByText("Parola e schimbată.")).toBeVisible();
  await expectAccessible(page);
  await shot(page, "56-cont-profil", project);

  // GDPR art. 15 and 20: the file with everything the club holds, with this session only.
  const exportUrl = await page.getByRole("link", { name: "Descarcă datele (JSON)" }).getAttribute("href");
  expect(exportUrl).toMatch(/\/api\/v1\/privacy\/export$/);
  const file = await page.request.get(exportUrl ?? "");
  expect(file.status()).toBe(200);
  expect(file.headers()["content-disposition"]).toContain("attachment");
  expect(await file.text()).toContain(email);

  // §12.2: deleting the account, confirmed with the password.
  await page.getByRole("button", { name: "Vreau să șterg contul" }).click();
  await page.getByLabel("Parola, pentru confirmare").fill("not-the-password");
  await page.getByRole("button", { name: "Șterge contul definitiv" }).click();
  await expect(page.getByText("Parola nu este corectă.")).toBeVisible();
  await page.getByLabel("Parola, pentru confirmare").fill(`${password}-3`);
  await page.getByRole("button", { name: "Șterge contul definitiv" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Contul e șters" })).toBeVisible();
  await page.goto("/ro/cont");
  await expect(page.getByRole("heading", { level: 2, name: "Intră în cont" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Parola").fill(`${password}-3`);
  await page.getByRole("button", { name: "Intră" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Emailul sau parola nu sunt corecte");
}

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

test("the account's inner pages ask to sign in first", async ({ page }) => {
  await page.goto("/ro/cont/plati");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Plăți și abonamente");
  await expect(page.getByText("Intră în cont ca să vezi această pagină.")).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Intră în cont" }).click();
  await expect(page).toHaveURL(/\/ro\/cont$/);
  await expect(page.getByRole("heading", { level: 2, name: "Intră în cont" })).toBeVisible();
  await expectAccessible(page);
});

test("in English", async ({ page }) => {
  await page.goto("/en/account");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("My account");
  await expect(page.getByRole("heading", { level: 2, name: "Sign in" })).toBeVisible();
  await page.goto("/en/account/register");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Create an account");
  await page.goto("/en/account/card");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Member card");
  await expect(page.getByRole("navigation", { name: "My account" }).getByRole("link", { name: "Card" })).toHaveAttribute("aria-current", "page");
});
