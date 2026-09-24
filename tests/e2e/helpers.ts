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

export async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Parola").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /Intră/ }).click();
  await expect(page).toHaveURL(/\/admin(\?|$)/);
}

/** Fills the details step of the booking form and submits it. */
export async function fillBookingDetails(page: Page, who: { name: string; email: string }) {
  const form = page.locator(".booking-form");
  await form.getByLabel("Numele tău").fill(who.name);
  await form.getByLabel(/^Email/).fill(who.email);
  await form.getByLabel(/^Telefon/).fill("0722 123 456");
  await form.locator('input[name="consent"]').check();
}

type MailpitMessage = {
  ID: string;
  Subject: string;
  To: { Address: string }[];
  Attachments: number;
};

/** Waits until Mailpit has a message for `to` whose subject matches. */
export async function waitForEmail(
  to: string,
  subject: RegExp,
  timeoutMs = 20_000,
): Promise<MailpitMessage> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetch(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
    );
    if (response.ok) {
      const body = (await response.json()) as { messages: MailpitMessage[] };
      const found = body.messages.find((m) => subject.test(m.Subject));
      if (found) return found;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Niciun email către ${to} cu subiectul ${subject}`);
}
