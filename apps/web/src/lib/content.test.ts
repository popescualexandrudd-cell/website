import { describe, expect, it, vi } from "vitest";
import { fieldsOf, mergeTexts, publishedTexts } from "./content";

const catalogue = {
  web: {
    hero: { title: "Intră în junglă", days: "{count, plural, one {# zi} other {# zile}}", hi: "Bună, {name}!" },
    legal: { note: "Redactat fără revizuire juridică." },
  },
  admin: { title: "Panou" },
};

describe("the website's texts changed from the panel (§8.6)", () => {
  it("reads the fields of an ICU text", () => {
    expect(fieldsOf("Bună, {name}! Ai {count, plural, one {# meci} other {# meciuri}}.")).toEqual(["count", "name"]);
    expect(fieldsOf("Fără câmpuri")).toEqual([]);
  });

  it("uses a change only where the catalogue has the text with the same fields", () => {
    const merged = mergeTexts(catalogue, {
      "web.hero.title": "Bine ai venit în junglă",
      "web.hero.hi": "Salut, {name}!",
      "web.hero.days": "{n} zile", // other fields: kept
      "web.hero.missing": "x", // not in the catalogue
      "web.hero": "x", // not a text
      "admin.title": "Altceva", // not the website's
      "web.legal.note": "Altă notă", // the legal texts: never from the panel
      "web.nowhere.deep.key": "x",
      "web.hero.title2": 5,
    });
    expect(merged).toEqual({
      web: {
        hero: { title: "Bine ai venit în junglă", days: catalogue.web.hero.days, hi: "Salut, {name}!" },
        legal: catalogue.web.legal,
      },
      admin: { title: "Panou" },
    });
    expect(catalogue.web.hero.title).toBe("Intră în junglă"); // the catalogue itself is untouched
    expect(mergeTexts(catalogue, { "web.hero.title": "   " })).toEqual(catalogue);
  });

  it("asks the API with the content tag, and falls back to nothing", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ "web.hero.title": "X" }), { status: 200 }));
    expect(await publishedTexts("ro", fetchImpl as unknown as typeof fetch)).toEqual({ "web.hero.title": "X" });
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining("/api/v1/content/texts?language=ro"), {
      next: { revalidate: 300, tags: ["content"] },
    });
    const down = vi.fn(async () => new Response("", { status: 503 }));
    expect(await publishedTexts("en", down as unknown as typeof fetch)).toEqual({});
    const odd = vi.fn(async () => new Response("[1]", { status: 200 }));
    expect(await publishedTexts("en", odd as unknown as typeof fetch)).toEqual({});
    const broken = vi.fn(async () => {
      throw new Error("offline");
    });
    expect(await publishedTexts("en", broken as unknown as typeof fetch)).toEqual({});
  });
});
