/**
 * The full site, sections 14–18 (§9.2, Stage 11): the community (badges, Hall of Fame from the
 * real API, "Bring a friend", R-120), the team (roles only, Q65), the club in numbers (only figures
 * from the docs), location and access, and the questions in short (R-053). Rendered on the server.
 */
import { expect, type Page, test } from "@playwright/test";
import { chooseNecessaryCookies, expectAccessible } from "../helpers";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Fame = {
  number: number;
  name: string;
  entries: { first_name: string; last_name: string; position: number }[];
}[];

async function shot(page: Page, name: string, project: string) {
  const dir = process.env.E2E_SCREENSHOTS;
  if (dir) await page.screenshot({ path: `${dir}/${project}-${name}.png` });
}

test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

test("§9.2.14, LG-134, R-120: the badges, the Hall of Fame from the real API and bringing a friend", async ({ page }, info) => {
  const response = await page.request.get(`${API}/api/v1/league/hall-of-fame?location=jungle-padel`);
  expect(response.ok()).toBe(true);
  const fame = (await response.json()) as Fame;
  await page.goto("/ro");
  const community = page.getByRole("region", {
    name: "Un club, nu doar terenuri.",
  });
  await community.scrollIntoViewIfNeeded();
  await expect(community.locator(".community__badge strong")).toHaveText([
    "Ucigaș de giganți",
    "10 victorii la rând",
    "Early Bird",
    "Săptămâni la rând",
    "Surpriza săptămânii",
    "Primul Diamant",
    "Regele Junglei",
  ]);
  // R-012: each player's badges stay private.
  await expect(community.getByText("Insignele fiecărui jucător se văd doar în contul lui.")).toBeVisible();
  const hall = community.getByRole("region", { name: "Hall of Fame" });
  if (fame.length === 0) {
    await expect(hall.getByText("Primii câștigători apar aici la finalul primului sezon.")).toBeVisible();
  } else {
    await expect(hall.locator(".community__seasons > li > h4")).toHaveText(fame.map((season) => season.name));
    const first = fame[0]?.entries[0];
    if (first) await expect(hall.locator(".community__winners").first()).toContainText(`${first.first_name} ${first.last_name}`);
  }
  await expect(community.getByRole("heading", { level: 3, name: "Adu un prieten" })).toBeVisible();
  await expect(community.getByText(/primiți amândoi câte o oră gratuită de padel/)).toBeVisible();
  await expectAccessible(page);
  await shot(page, "20-comunitate", info.project.name);
});

test("§9.2.15, Q65: the team's roles, without invented names", async ({ page }, info) => {
  await page.goto("/ro");
  const team = page.getByRole("region", {
    name: "Oamenii din spatele clubului.",
  });
  await team.scrollIntoViewIfNeeded();
  await expect(team.getByRole("heading", { level: 3 })).toHaveText(["Antrenorii de padel", "Instructorul de Reformer", "Recepția"]);
  await expect(team.getByText("Numele și fotografiile echipei apar aici când echipa e completă.")).toBeVisible();
  await expect(team.locator("img")).toHaveCount(0);
  await shot(page, "21-echipa", info.project.name);
});

test("§9.2.16: the club in numbers ends on the real figures", async ({ page }, info) => {
  await page.goto("/ro");
  const numbers = page.getByRole("region", { name: "Clubul în cifre." });
  await numbers.scrollIntoViewIfNeeded();
  await expect(numbers.locator(".tennis__fact")).toHaveText(["4", "3 m", "4", "20", "28", "3"]);
  await expect(numbers.getByText("locuri de parcare: 18 în spate și 10 în față")).toBeVisible();
  await expectAccessible(page);
  await shot(page, "22-cifre", info.project.name);
});

test("§9.2.17: location and access, with links that open the visitor's own maps", async ({ page }, info) => {
  await page.goto("/ro");
  const location = page.locator("#locatie");
  await location.scrollIntoViewIfNeeded();
  await expect(location.getByRole("heading", { level: 2 })).toHaveText("La marginea de est a Bucureștiului.");
  await expect(location.getByText("Șoseaua Biruinței, lângă Selgros Pantelimon")).toBeVisible();
  await expect(location.getByText("Parcare: 18 locuri în spate și 10 în față")).toBeVisible();
  for (const name of ["Waze (fereastră nouă)", "Google Maps (fereastră nouă)", "Deschide locația în OpenStreetMap (fereastră nouă)"]) {
    const link = location.getByRole("link", { name });
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }
  // No embedded map, no third-party frame.
  await expect(page.locator("iframe")).toHaveCount(0);
  await expectAccessible(page);
  await shot(page, "23-locatie", info.project.name);
});

test("§9.2.18, R-053: the questions open without script and lead to the Terms", async ({ page }, info) => {
  await page.goto("/ro");
  const faq = page.getByRole("region", { name: "Pe scurt, înainte să vii." });
  await faq.scrollIntoViewIfNeeded();
  await expect(faq.locator("summary")).toHaveCount(8);
  const hours = faq.locator("details").first();
  await expect(hours.getByText(/de la 08:00 la 23:00/)).toBeHidden();
  await hours.locator("summary").click();
  await expect(hours.getByText("Clubul e deschis în fiecare zi, de la 08:00 la 23:00. Vârful e între 17:00 și 22:00.")).toBeVisible();
  const credits = faq.locator("details", {
    hasText: "Trebuie să cumpăr credite pentru padel?",
  });
  await credits.locator("summary").click();
  await expect(credits.getByText("Nu. Plătești ora de teren, iar jucătorii o împart.")).toBeVisible();
  await expectAccessible(page);
  await shot(page, "24-intrebari", info.project.name);
  await faq.getByRole("link", { name: "Termeni și condiții" }).click();
  await expect(page).toHaveURL(/\/ro\/termeni-si-conditii$/);
});

test("§9.2.19: the footer adds the club's pages, the hours and the languages", async ({ page }, info) => {
  await page.goto("/ro");
  const footer = page.locator("footer");
  await footer.scrollIntoViewIfNeeded();
  const club = footer.getByRole("navigation", { name: "Clubul" });
  await expect(club.getByRole("link")).toHaveText([
    "Padel",
    "Liga",
    "Tenis",
    "Pilates",
    "Pachete",
    "Evenimente",
    "Cafenea",
    "Contact",
    "Română",
    "English",
  ]);
  await expect(club.getByText("În fiecare zi, 08:00–23:00")).toBeVisible();
  // The legal part stays as it was.
  await expect(footer.getByRole("link", { name: "Termeni și condiții" })).toBeVisible();
  await expectAccessible(page);
  await shot(page, "25-subsol", info.project.name);
  await club.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("footer").getByRole("navigation", { name: "The club" }).getByRole("link", { name: "League" })).toBeVisible();
});

test("in English", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("region", { name: "A club, not just courts." })).toBeVisible();
  await expect(page.getByRole("region", { name: "The people behind the club." })).toBeVisible();
  await expect(page.getByRole("region", { name: "The club in numbers." })).toBeVisible();
  await expect(page.getByRole("region", { name: "In short, before you come." }).locator("summary").first()).toHaveText(
    "When is the club open, and what are the peak hours?",
  );
});
