/**
 * The full site, section 3 (§9.2.3, Stage 11): the tour of the club on scroll, over the plan
 * redrawn from the owner's sketch. Runs after the owner's switch is turned on (`full_site`, Q57).
 */
import { expect, type Locator, type Page, test } from "@playwright/test";
import { chooseNecessaryCookies, expectAccessible } from "../helpers";

const STOPS_RO = [
  "Parcarea",
  "Aleea",
  "Recepția și vestiarele",
  "Terenurile",
  "Mezaninul",
  "Cafeneaua",
  "Pilates Reformer",
  "Sala de evenimente",
];

async function shot(page: Page, name: string, project: string) {
  const dir = process.env.E2E_SCREENSHOTS;
  if (dir) await page.screenshot({ path: `${dir}/${project}-${name}.png` });
}

/** Brings a stop to the middle of the screen, as a reader scrolling to it would. */
async function scrollToMiddle(stop: Locator) {
  await stop.evaluate((element) => element.scrollIntoView({ block: "center" }));
}

test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

test("§9.2.3: eight stops in the visitor's order; the plan lights the stop on screen", async ({ page }, info) => {
  await page.goto("/ro");
  const tour = page.getByRole("region", { name: "Opt opriri, de la parcare la sala de evenimente." });
  const stops = tour.getByRole("listitem");
  await expect(stops.getByRole("heading", { level: 3 })).toHaveText(STOPS_RO);
  await expect(tour.getByRole("img", { name: "Planul clubului (schemă)" })).toBeVisible();
  await expect(tour.getByText(/Plan schematic după schița clubului/)).toBeAttached();

  const stop = (title: string) => stops.filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  const mezzanine = stop("Mezaninul");
  await scrollToMiddle(mezzanine);
  await expect(mezzanine).toHaveAttribute("aria-current", "step");
  await expect(stops.and(page.locator('[aria-current="step"]'))).toHaveCount(1);
  await expect(tour.locator(".tour__area")).toHaveAttribute("y", "184"); // the walkway on the plan
  await expect(tour.getByRole("img", { name: "Planul clubului (schemă)" })).toBeInViewport(); // the plan stays on screen
  await expectAccessible(page);
  await shot(page, "04-tur", info.project.name);

  const events = stop("Sala de evenimente");
  await scrollToMiddle(events);
  await expect(events).toHaveAttribute("aria-current", "step");
  await expect(tour.locator(".tour__area")).toHaveAttribute("y", "370");
  await expect(mezzanine).not.toHaveAttribute("aria-current", "step");
});

test("in English, with only confirmed facts", async ({ page }) => {
  await page.goto("/en");
  const tour = page.getByRole("region", { name: "Eight stops, from the car park to the events room." });
  await expect(tour.getByRole("heading", { level: 3 }).first()).toHaveText("The car park");
  await expect(tour.getByText(/18 spaces at the back and 10 at the front/)).toBeVisible();
  await expect(tour.getByText(/4 Reformer machines at opening, expandable to 6/)).toBeAttached();
  await expect(tour.getByText(/15–20 people/)).toBeAttached();
});
