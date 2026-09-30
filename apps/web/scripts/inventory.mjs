#!/usr/bin/env node
/**
 * The site's inventory (effects work, rule 3.4: nothing disappears, nothing changes, only motion is
 * added). Opens every page of the full site in Romanian and English and lists what a visitor can
 * see and use, plus what the code declares; the same script before and after a change, then
 * `--compare` proves the difference holds only additions.
 *
 *   node scripts/inventory.mjs --out INVENTAR_INAINTE.json        (servers running, full_site on)
 *   node scripts/inventory.mjs --compare INVENTAR_INAINTE.json INVENTAR_DUPA.json
 *   SHOTS=<folder> also saves a full-page capture of every page (the visual reference).
 *
 * BASE_URL (default http://localhost:3000) and NEXT_PUBLIC_API_URL (default http://localhost:8000)
 * point at the running site and API; PW_CHROMIUM_PATH at a Chromium when Playwright's is absent.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const REPO = join(ROOT, "../..");
const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

/** Every localised path of the site (src/i18n/routing.ts), read from the source. */
function pages() {
  const source = readFileSync(join(ROOT, "src/i18n/routing.ts"), "utf8");
  const out = { ro: ["/ro"], en: ["/en"] };
  for (const match of source.matchAll(/\{\s*ro:\s*"([^"]+)",\s*en:\s*"([^"]+)"\s*\}/g)) {
    out.ro.push(`/ro${match[1]}`);
    out.en.push(`/en${match[2]}`);
  }
  return out;
}

/** The keys of the site's texts (web.*), flattened: "web.site.cafe.menu.title". */
function keys(tree, prefix = "") {
  if (typeof tree !== "object" || tree === null || Array.isArray(tree)) return [prefix];
  return Object.entries(tree).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));
}

function codeFacts() {
  const src = join(ROOT, "src");
  const tsx = files(src).filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));
  const client = tsx.filter((f) => readFileSync(f, "utf8").startsWith('"use client"')).map((f) => relative(ROOT, f));
  const catalogs = Object.fromEntries(
    ["ro", "en"].map((lang) => [lang, keys(JSON.parse(readFileSync(join(REPO, `packages/i18n/messages/${lang}.json`), "utf8")).web, "web")]),
  );
  const registry = readFileSync(join(REPO, "apps/backend/jungle/configuration/registry.py"), "utf8");
  const flags = [...registry.matchAll(/FlagSpec\(\s*"([a-z_]+)"/g)].map((m) => m[1]);
  const sections = [...readFileSync(join(src, "components/FullHome.tsx"), "utf8").matchAll(/^\s+"([a-z]+)",$/gm)].map((m) => m[1]);
  return { clientComponents: client.sort(), translationKeys: catalogs, flags: flags.sort(), homeSections: sections };
}

async function pageFacts(page, path) {
  const calls = new Set();
  const listener = (request) => {
    if (request.url().startsWith(API)) calls.add(`${request.method()} ${new URL(request.url()).pathname}`);
  };
  page.on("request", listener);
  const response = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  // Everything that appears on scroll must have appeared: go to the bottom and back.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 30));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle");
  if (process.env.SHOTS) {
    const file = `${process.env.SHOTS}/${page.viewportSize()?.width === 390 ? "mobile" : "desktop"}${path.replaceAll("/", "_")}.png`;
    await page.screenshot({ path: file, fullPage: true });
  }
  const facts = await page.evaluate(() => {
    const text = (el) => (el.textContent ?? "").replace(/\s+/g, " ").trim();
    const name = (el) => el.getAttribute("aria-label") ?? (el.getAttribute("aria-labelledby") ? text(document.getElementById(el.getAttribute("aria-labelledby").split(" ")[0]) ?? el) : text(el));
    const main = document.querySelector("main") ?? document.body;
    return {
      title: document.title,
      lang: document.documentElement.lang,
      meta: [...document.querySelectorAll("head meta[name], head meta[property], head link[rel=alternate], head link[rel=canonical]")].map(
        (m) => `${m.getAttribute("name") ?? m.getAttribute("property") ?? m.getAttribute("rel")}=${m.getAttribute("content") ?? m.getAttribute("href")}${m.getAttribute("hreflang") ? `@${m.getAttribute("hreflang")}` : ""}`,
      ),
      sections: [...main.querySelectorAll("section")].map((s) => `${s.id || "-"}|${name(s)}`),
      headings: [...document.querySelectorAll("h1,h2,h3,h4")].map((h) => `${h.tagName}|${text(h)}`),
      links: [...document.querySelectorAll("a[href]")].map((a) => `${text(a) || a.getAttribute("aria-label") || ""}|${a.getAttribute("href")}`),
      buttons: [...document.querySelectorAll("button")].map((b) => `${b.getAttribute("aria-label") ?? text(b)}`),
      fields: [...document.querySelectorAll("form input, form select, form textarea")].map((f) => `${f.closest("form")?.getAttribute("aria-label") ?? "-"}|${f.getAttribute("name") ?? f.id}|${f.getAttribute("type") ?? f.tagName.toLowerCase()}`),
      images: [...document.querySelectorAll("img")].map((i) => `${i.getAttribute("src")}|${i.getAttribute("alt")}`),
      regions: [...document.querySelectorAll("[role=region]")].map((r) => name(r)),
      jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
    };
  });
  page.off("request", listener);
  return { status: response?.status() ?? 0, ...facts, apiCalls: [...calls].sort() };
}

async function take(out) {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
  const inventory = { code: codeFacts(), pages: {} };
  for (const viewport of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport, locale: "ro-RO" });
    // The necessary-cookies choice, as the tests make it (no banner over the page).
    const consent = encodeURIComponent(JSON.stringify({ v: 1, stats: false, ts: Date.now() }));
    await context.addCookies([{ name: "jp_consent", value: consent, url: BASE }]);
    const page = await context.newPage();
    for (const [lang, paths] of Object.entries(pages())) {
      for (const path of paths) inventory.pages[`${viewport.name} ${path}`] = { lang, ...(await pageFacts(page, path)) };
    }
    await context.close();
  }
  await browser.close();
  writeFileSync(out, `${JSON.stringify(inventory, null, 2)}\n`);
  console.log(`inventory: ${Object.keys(inventory.pages).length} pages → ${out}`);
}

/** Every item of `before` is in `after` (lists compared as multisets); returns what is missing. */
function missing(before, after, path = "") {
  if (Array.isArray(before)) {
    const left = [...(Array.isArray(after) ? after : [])].map((x) => JSON.stringify(x));
    const gone = [];
    for (const item of before) {
      const i = left.indexOf(JSON.stringify(item));
      if (i === -1) gone.push(`${path}: ${JSON.stringify(item)}`);
      else left.splice(i, 1);
    }
    return gone;
  }
  if (typeof before === "object" && before !== null) {
    return Object.entries(before).flatMap(([k, v]) => (after && k in after ? missing(v, after[k], `${path}/${k}`) : [`${path}/${k}: gone`]));
  }
  return before === after ? [] : [`${path}: ${JSON.stringify(before)} → ${JSON.stringify(after)}`];
}

function added(before, after, path = "") {
  if (Array.isArray(after)) {
    const left = [...(Array.isArray(before) ? before : [])].map((x) => JSON.stringify(x));
    return after.filter((item) => {
      const i = left.indexOf(JSON.stringify(item));
      if (i === -1) return true;
      left.splice(i, 1);
      return false;
    }).map((item) => `${path}: ${JSON.stringify(item)}`);
  }
  if (typeof after === "object" && after !== null) {
    return Object.entries(after).flatMap(([k, v]) => (before && typeof before === "object" && k in before ? added(before[k], v, `${path}/${k}`) : [`${path}/${k}: new`]));
  }
  return [];
}

const args = process.argv.slice(2);
if (args[0] === "--compare") {
  const [before, after] = args.slice(1).map((f) => JSON.parse(readFileSync(f, "utf8")));
  const gone = missing(before, after);
  const plus = added(before, after);
  console.log(`added: ${plus.length}`);
  for (const line of plus) console.log(`  + ${line}`);
  console.log(`removed or changed: ${gone.length}`);
  for (const line of gone) console.log(`  - ${line}`);
  process.exit(gone.length ? 1 : 0);
} else {
  const out = args[args.indexOf("--out") + 1];
  if (!args.includes("--out") || !out) {
    console.error("usage: inventory.mjs --out FILE | --compare BEFORE AFTER");
    process.exit(2);
  }
  await take(out);
}
