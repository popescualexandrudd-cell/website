/**
 * The full site, section 12 (§9.2.12, Stage 11): events (R-110). DJ nights, the league's tournaments
 * and social padel; the club's calendar as the server gives it (here the two demo events of
 * `seed_initial --demo`, marked as such), in club time; the event room with its size and hour from
 * the API (Q34, Q46). Rendered on the server.
 */
import { expect, type Page, test } from "@playwright/test";
import { chooseNecessaryCookies, expectAccessible } from "../helpers";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TITLE = "Seri cu DJ, turnee și o sală doar a voastră.";

type Item = { title_ro: string; title_en: string; demo: boolean; starts_at: string };
type Calendar = { items: Item[]; room: { capacity: number; price_per_hour: number | null; provisional: boolean } | null };

async function shot(page: Page, name: string, project: string) {
  const dir = process.env.E2E_SCREENSHOTS;
  if (dir) await page.screenshot({ path: `${dir}/${project}-${name}.png` });
}

async function calendar(page: Page): Promise<Calendar> {
  const response = await page.request.get(`${API}/api/v1/events/calendar?location=jungle-padel`);
  expect(response.ok()).toBe(true);
  return (await response.json()) as Calendar;
}

const time = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));

test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

test("§9.2.12, R-110: the kinds of events, the calendar from the real API and the event room", async ({ page }, info) => {
  const data = await calendar(page);
  await page.goto("/ro");
  const events = page.getByRole("region", { name: TITLE });
  await events.scrollIntoViewIfNeeded();
  await expect(events.locator(".padel__card h3")).toHaveText(["Seri cu DJ", "Turneele ligii", "Padel social"]);

  const list = events.getByRole("region", { name: "Calendarul" });
  // The demo data has two events, a Friday night and a Saturday morning, both marked.
  expect(data.items.length).toBeGreaterThanOrEqual(2);
  await expect(list.locator(".events__title")).toHaveText(data.items.map((item) => item.title_ro));
  for (const [i, item] of data.items.entries()) {
    const entry = list.locator(".events__item").nth(i);
    await expect(entry.locator("time")).toHaveAttribute("datetime", item.starts_at);
    await expect(entry.locator(".events__time")).toContainText(time(item.starts_at));
    if (item.demo) await expect(entry.getByText("Exemplu (demo)")).toBeVisible();
  }
  await expect(list.getByText("Orele sunt ale clubului (ora României).")).toBeVisible();

  const room = events.getByRole("region", { name: "Sala de evenimente" });
  await expect(room.getByText(/în clădirea de alături, cu studioul de pilates/)).toBeVisible();
  const facts = room.getByRole("list", { name: "Sala pe scurt" });
  expect(data.room).not.toBeNull();
  await expect(facts).toContainText(`${data.room?.capacity}persoane, cel mult`);
  if (data.room?.price_per_hour) {
    await expect(facts).toContainText(`${data.room.price_per_hour / 100} lei`);
    if (data.room.provisional) await expect(facts).toContainText("preț orientativ");
  }
  await expect(events.getByRole("link", { name: "Cere sala de evenimente" })).toHaveAttribute("href", "/ro/cont/evenimente");
  // Q34 (owner, 30.09.2026): online or by phone, a manager confirms; the call button only with the
  // club's phone set in the panel.
  await expect(room.getByText(/Cererea se face online, din cont, sau telefonic/)).toBeVisible();
  const company = (await (await page.request.get(`${API}/api/v1/config/company`)).json()) as { phone?: string };
  const call = events.getByRole("link", { name: "Sună la club" });
  if (company.phone) await expect(call).toHaveAttribute("href", `tel:${company.phone.replace(/[\s().-]+/g, "")}`);
  else await expect(call).toHaveCount(0);
  await expectAccessible(page);
  await shot(page, "16-evenimente", info.project.name);
  await room.scrollIntoViewIfNeeded();
  await shot(page, "17-sala-evenimente", info.project.name);
});

test("in English", async ({ page }) => {
  const data = await calendar(page);
  await page.goto("/en");
  const events = page.getByRole("region", { name: "DJ nights, tournaments and a room of your own." });
  await expect(events.getByRole("region", { name: "The calendar" }).locator(".events__title")).toHaveText(
    data.items.map((item) => item.title_en),
  );
  await expect(events.getByRole("link", { name: "Request the event room" })).toHaveAttribute("href", "/en/account/events");
});
