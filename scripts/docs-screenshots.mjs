// Captures of the admin panel for GHID-ADMIN.md, taken on a phone-sized screen (390 × 844).
// Each capture is saved as an SVG that embeds a JPEG image (base64), so the repository keeps
// only text files.
//   BASE=http://localhost:3000 ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/docs-screenshots.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const base = process.env.BASE ?? "http://localhost:3000";
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) {
  console.error("Setează ADMIN_EMAIL și ADMIN_PASSWORD (un cont de proprietar).");
  process.exit(1);
}
const outDir = new URL("../docs/capturi/", import.meta.url);
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
);
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: "ro-RO",
  timezoneId: "Europe/Bucharest",
  ignoreHTTPSErrors: true,
});
const page = await context.newPage();

async function save(name, alt, { fullPage = false, maxHeight = 1500 } = {}) {
  await page.waitForTimeout(400);
  const png = await page.screenshot({ fullPage });
  const image = sharp(png);
  const meta = await image.metadata();
  const height = Math.min(meta.height ?? 1688, maxHeight * 2);
  const jpeg = await image
    .extract({ left: 0, top: 0, width: meta.width ?? 780, height })
    .jpeg({ quality: 70, mozjpeg: true })
    .toBuffer();
  const w = (meta.width ?? 780) / 2;
  const h = height / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${alt.replace(/"/g, "&quot;")}"><title>${alt.replace(/</g, "&lt;")}</title><image width="${w}" height="${h}" href="data:image/jpeg;base64,${jpeg.toString("base64")}"/></svg>\n`;
  writeFileSync(new URL(`${name}.svg`, outDir), svg);
  console.info(`  ${name}.svg`);
}

async function go(path) {
  await page.goto(base + path, { waitUntil: "networkidle" });
}

await go("/admin/login");
await save("01-autentificare", "Pagina de autentificare în panoul de administrare");
await page.fill('input[name="email"]', email);
await page.fill('input[name="password"]', password);
await page.click('button[type="submit"]');
await page.waitForURL(/\/admin(\?|$)/);

await save(
  "02-tablou-de-bord",
  "Tabloul de bord: rezervări de confirmat, mesaje, grad de ocupare",
  { fullPage: true },
);
await page.getByRole("button", { name: "Meniu" }).click();
await save("03-meniu", "Meniul complet deschis pe telefon");
await page.getByRole("button", { name: "Închide" }).click();

await go("/admin/azi");
await save("04-azi", "Lecțiile de azi, cu butoane de apel și WhatsApp", { fullPage: true });
await go("/admin/rezervari");
await save("05-rezervari", "Lista rezervărilor cu filtre", { fullPage: true });
const first = page.locator('a.admin-row-link[href^="/admin/rezervari/"]').first();
if (await first.count()) {
  await go((await first.getAttribute("href")) ?? "/admin");
  await save("06-rezervare", "O rezervare: detalii, contact și acțiuni", { fullPage: true });
}
await go("/admin/rezervari/noua");
await save("07-rezervare-manuala", "Formularul pentru o rezervare primită la telefon", {
  fullPage: true,
});
await go("/admin/disponibilitate");
await save("08-disponibilitate", "Programul săptămânal și excepțiile (concediu, zile libere)", {
  fullPage: true,
});

await go("/admin/continut");
await save("09-continut", "Toate tipurile de conținut, grupate", { fullPage: true });
await go("/admin/continut/programe");
await save("10-lista-ordonabila", "O listă ordonabilă: mânerul de tragere și săgețile sus/jos");
const program = page.locator('.sortable-item a[href^="/admin/continut/programe/"]').first();
if (await program.count()) {
  await go((await program.getAttribute("href")) ?? "/admin");
  await save("11-editare", "Editarea unui program: texte în română și engleză");
  const md = page.getByRole("button", { name: "Previzualizare" }).first();
  await md.scrollIntoViewIfNeeded();
  await md.click();
  await page.waitForTimeout(800);
  await save("12-previzualizare-markdown", "Previzualizarea textului formatat");
}
await go("/admin/continut/scene");
const scene = page.locator('.sortable-item a[href^="/admin/continut/scene/"]').first();
if (await scene.count()) {
  await go((await scene.getAttribute("href")) ?? "/admin");
  await page.locator("legend", { hasText: "Mingea aurie" }).scrollIntoViewIfNeeded();
  await save("13-scena-minge", "Reglajele unei scene: poziția textului și a mingii, tranziția");
}
await go("/admin/media");
await save("14-media", "Încărcarea unei fotografii, cu descrierea obligatorie", { fullPage: true });
await go("/admin/continut/galerie/nou");
await page.locator("legend", { hasText: "Acord" }).scrollIntoViewIfNeeded();
await save("15-galerie-acord", "Fotografiile cu minori se publică doar cu acordul părinților");
await go("/admin/mesaje?stare=toate");
await save("16-mesaje", "Mesajele din formularul de contact", { fullPage: true });
await go("/admin/clienti");
const client = page.locator('.admin-row a[href^="/admin/clienti/"]').first();
if (await client.count()) {
  await go((await client.getAttribute("href")) ?? "/admin");
  await save("17-client", "Fișa unui client: pachet, istoric, date GDPR", { fullPage: true });
}
await go("/admin/setari");
await save("18-setari", "Setările site-ului");

await browser.close();
console.info("Gata: docs/capturi/");
