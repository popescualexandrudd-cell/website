/**
 * The full site's presentation pages (§9.3): Padel, Tennis, Pilates, Packages, Events, Café,
 * Contact, For companies (Q35) and About, each with its title and introduction, then the approved home sections, from the real
 * API. The contact page shows the club's phone and email only as the panel has them.
 */
import { expect, type Page, test } from "@playwright/test";
import { chooseNecessaryCookies, expectAccessible } from "../helpers";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function shot(page: Page, name: string, project: string) {
  const dir = process.env.E2E_SCREENSHOTS;
  if (dir) await page.screenshot({ path: `${dir}/${project}-${name}.png` });
}

const PAGES: { path: string; title: string; section: string }[] = [
  { path: "/ro/padel", title: "Padel", section: "#padel" },
  { path: "/ro/tenis", title: "Tenis", section: "#tenis" },
  { path: "/ro/pilates", title: "Pilates Reformer", section: "#pilates" },
  { path: "/ro/pachete", title: "Pachete și abonamente", section: "#pachete" },
  { path: "/ro/evenimente", title: "Evenimente", section: "#evenimente" },
  { path: "/ro/cafenea", title: "Cafeneaua", section: "#cafenea" },
  { path: "/ro/contact", title: "Contact", section: "#locatie" },
  { path: "/ro/corporate", title: "Pentru firme", section: "#firme" },
  { path: "/ro/despre", title: "Despre club", section: "#tur" },
];

test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

for (const { path, title, section } of PAGES) {
  test(`§9.3: ${path}, its title, introduction and sections`, async ({ page }, info) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.locator(".page-intro .lead")).not.toBeEmpty();
    await expect(page.locator(section)).toBeVisible();
    await expect(page.getByText(/se construiește în Etapa 11/)).toHaveCount(0);
    // Its own address, in both languages.
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${path}$`));
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
    await expectAccessible(page);
    await shot(page, `4${PAGES.findIndex((p) => p.path === path)}-pagina-${path.split("/").pop()}`, info.project.name);
  });
}

test("§9.3: the padel page keeps its simulators (level, share the hour) working", async ({ page }) => {
  await page.goto("/ro/padel");
  await expect(page.getByRole("region", { name: "Simulatorul „Împarte ora”" }).locator(".configurator__total")).toContainText("lei");
});

test("§9.3, §12: the contact page shows the club's phone and email only as the panel has them", async ({ page }) => {
  const company = (await (await page.request.get(`${API}/api/v1/config/company`)).json()) as { phone: string | null; email: string | null };
  await page.goto("/ro/contact");
  const details = page.getByRole("region", { name: "Date de contact" });
  if (company.phone?.trim()) await expect(details.getByRole("link", { name: company.phone.trim() })).toHaveAttribute("href", /^tel:/);
  if (company.email?.trim()) await expect(details.getByRole("link", { name: company.email.trim() })).toHaveAttribute("href", `mailto:${company.email.trim()}`);
  if (!company.phone?.trim() || !company.email?.trim()) await expect(details.getByText("În curs de completare").first()).toBeVisible();
  // No contact form: nothing personal is asked on the site.
  await expect(page.locator("main form")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Pe scurt, înainte să vii." })).toBeVisible();
});

test("in English", async ({ page }) => {
  await page.goto("/en/cafe");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The café");
  await page.goto("/en/contact");
  await expect(page.getByRole("heading", { level: 2, name: "Contact details" })).toBeVisible();
});
