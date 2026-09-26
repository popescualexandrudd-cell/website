import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "antrenor@example.com";
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "parola-test-2026!";
const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";

/** A unique suffix per run, so tests never collide with data left by an earlier run. */
export const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

let ipCounter = Math.floor(Math.random() * 200);

/**
 * Each context gets its own client IP (the app trusts X-Forwarded-For from the proxy), so the
 * per-IP rate limits behave as for separate visitors.
 */
export async function newVisitor(browser: Browser): Promise<BrowserContext> {
  ipCounter += 1;
  return browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": `198.51.100.${ipCounter % 250}` },
  });
}

/** The admin session cookies, reused by every test after the first login of the run. */
let adminCookies: Awaited<ReturnType<BrowserContext["cookies"]>> | null = null;

/**
 * Signs in to the admin. The first call logs in through the form; later calls reuse its session,
 * so a run (or several runs in a row) stays well under the login limit of 10 per email in 15
 * minutes, which protects the real admin from password guessing.
 */
export async function loginAsAdmin(page: Page) {
  if (adminCookies) {
    await page.context().addCookies(adminCookies);
    await page.goto("/admin");
    if (/\/admin(\?|$)/.test(new URL(page.url()).pathname + new URL(page.url()).search)) return;
  }
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Parola").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /Intră/ }).click();
  await expect(page).toHaveURL(/\/admin(\?|$)/);
  adminCookies = await page.context().cookies();
}

/**
 * Fills "Datele mele" (step 4), moves on to the confirmation (step 5) and ticks the consent,
 * leaving only the final submit to the test.
 */
export async function fillBookingDetails(page: Page, who: { name: string; email: string }) {
  const flow = page.locator(".booking-flow");
  await expect(flow.getByRole("heading", { name: "Datele mele" })).toBeVisible();
  await flow.getByLabel("Numele tău").fill(who.name);
  await flow.getByLabel(/^Email/).fill(who.email);
  await flow.getByLabel(/^Telefon/).fill("0722 123 456");
  await flow.getByRole("button", { name: "Verifică și trimite" }).click();
  await expect(flow.getByRole("heading", { name: "Confirmarea rezervării" })).toBeVisible();
  await flow.locator('input[name="consent"]').check();
}

type MailpitMessage = {
  ID: string;
  Subject: string;
  To: { Address: string }[];
  Attachments: number;
};

/** Waits until Mailpit has a message (for `to`, when given) whose subject matches. */
export async function waitForEmail(
  to: string | null,
  subject: RegExp,
  timeoutMs = 20_000,
): Promise<MailpitMessage> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetch(
      to
        ? `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`
        : `${MAILPIT}/api/v1/messages?limit=200`,
    );
    if (response.ok) {
      const body = (await response.json()) as { messages: MailpitMessage[] };
      const found = body.messages.find((m) => subject.test(m.Subject));
      if (found) return found;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Niciun email către ${to ?? "oricine"} cu subiectul ${subject}`);
}
