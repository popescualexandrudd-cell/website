/**
 * The installable site (§9.4, PWA): the manifest with its icons and, on the full site, the shortcuts;
 * the service worker that, with no connection, shows the offline page in the visitor's language and
 * never keeps a page of the account on the phone.
 */
import { expect, test } from "@playwright/test";
import { chooseNecessaryCookies, expectAccessible } from "../helpers";

test.use({ serviceWorkers: "allow" });
test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

test("§9.4: the manifest names the app, its icons and the shortcuts", async ({ page, request }) => {
  await page.goto("/ro");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBeTruthy();
  const manifest = await (await request.get(href ?? "")).json();
  expect(manifest).toMatchObject({ name: "Jungle Padel", start_url: "/ro", display: "standalone", lang: "ro" });
  expect(manifest.icons.map((icon: { purpose: string }) => icon.purpose)).toEqual(["any", "any", "maskable"]);
  for (const icon of manifest.icons as { src: string }[]) {
    const file = await request.get(icon.src);
    expect(file.status(), icon.src).toBe(200);
    expect(file.headers()["content-type"]).toBe("image/png");
  }
  expect(manifest.shortcuts.map((s: { url: string }) => s.url)).toEqual(["/ro/rezervari", "/ro/cont", "/ro/liga"]);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", /apple-touch-icon\.png/);
});

test("§9.4: without a connection, the offline page; the account is never kept on the phone", async ({ page, context }) => {
  await page.goto("/ro/padel");
  // The service worker registers after the load and takes over the page.
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.ready.then(() => Boolean(navigator.serviceWorker.controller))), { timeout: 15_000 }).toBe(true);
  await page.goto("/ro/cont");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contul meu");

  const kept = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) urls.push(new URL(request.url).pathname);
    return urls;
  });
  expect(kept).toEqual(expect.arrayContaining(["/ro/offline", "/en/offline"]));
  expect(kept.filter((path) => !/^\/(_next\/static|fonts|icons|renders)\//.test(path)).sort()).toEqual(["/en/offline", "/ro/offline"]);

  // The account's page holds no personal data (it asks the API after loading); a page not seen before:
  await context.setOffline(true);
  await page.goto("/ro/cont/card");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nu ești conectat la internet");
  await expectAccessible(page);
  // Back online, "try again" opens the page that was asked for.
  await context.setOffline(false);
  await page.getByRole("button", { name: "Încearcă din nou" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cardul de membru");
  // The English one, kept at install for the /en pages (Playwright's offline mode reaches the
  // service worker reliably only once per page, so it is opened here directly).
  await page.goto("/en/offline");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("You are offline");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});
