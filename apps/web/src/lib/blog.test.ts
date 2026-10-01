import { describe, expect, it } from "vitest";
import { type Article, type ArticleSummary, article, articles, inLanguage, readingMinutes } from "./blog";

const item: Article = {
  slug: "ce-este-padelul",
  title_ro: "Ce este padelul",
  title_en: "What padel is",
  summary_ro: "Pe scurt",
  summary_en: "In short",
  published_at: "2027-03-15T07:00:00Z",
  updated_at: "2027-03-15T07:00:00Z",
  demo: false,
  body_ro: "## Terenul",
  body_en: "## The court",
};

const answer = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("the blog (§9.3)", () => {
  it("the texts in the page's language", () => {
    expect(inLanguage(item, "ro")).toEqual({ title: "Ce este padelul", summary: "Pe scurt", body: "## Terenul" });
    expect(inLanguage(item, "en")).toEqual({ title: "What padel is", summary: "In short", body: "## The court" });
    const summary: ArticleSummary = {
      slug: item.slug,
      title_ro: item.title_ro,
      title_en: item.title_en,
      summary_ro: item.summary_ro,
      summary_en: item.summary_en,
      published_at: item.published_at,
      updated_at: item.updated_at,
      demo: item.demo,
    };
    expect(inLanguage(summary, "ro").body).toBe("");
  });

  it("reading time: about 200 words a minute, at least one", () => {
    expect(readingMinutes("")).toBe(1);
    expect(readingMinutes("cuvânt ".repeat(650))).toBe(3);
  });

  it("anything that is not an address is not asked for", async () => {
    let asked = 0;
    const counting = (async () => {
      asked += 1;
      return new Response("{}", { status: 404 });
    }) as unknown as typeof fetch;
    for (const bad of ["../staff", "Mare", "cu spatii", "-x", "a".repeat(81)]) expect(await article(bad, counting)).toBeNull();
    expect(asked).toBe(0);
    expect(await article("ce-este-padelul", answer(item))).toEqual(item);
    expect(await article("nu-exista", answer({ error: {} }, 404))).toBeNull();
  });

  it("the list, or null when the API does not answer", async () => {
    expect(await articles(answer([item]))).toEqual([item]);
    expect(await articles(answer({ nope: true }))).toBeNull();
    const down = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    expect(await articles(down)).toBeNull();
  });
});
