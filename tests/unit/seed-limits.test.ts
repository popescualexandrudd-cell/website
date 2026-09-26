import { describe, expect, it } from "vitest";
import { postContent } from "@/prisma/seed/content/posts";
import { homeSeo, pageHeaderContent } from "@/prisma/seed/content/site";

/** The admin's limit for "Titlu pentru Google" (lib/admin/resources.ts, seoFields). */
const SEO_TITLE_MAX = 70;
const SEO_DESCRIPTION_MAX = 160;

type Seo = {
  seoTitle?: { ro: string; en: string } | null;
  seoDescription?: { ro: string; en: string } | null;
};

function tooLong(name: string, seo: Seo): string[] {
  const out: string[] = [];
  for (const lang of ["ro", "en"] as const) {
    const title = seo.seoTitle?.[lang] ?? "";
    const description = seo.seoDescription?.[lang] ?? "";
    if (title.length > SEO_TITLE_MAX) out.push(`${name} ${lang} title: ${title.length}`);
    if (description.length > SEO_DESCRIPTION_MAX)
      out.push(`${name} ${lang} description: ${description.length}`);
  }
  return out;
}

describe("the initial content fits the admin's limits", () => {
  // A seeded text longer than the form allows would block every save of that form.
  it("keeps every Google title and description short enough to save", () => {
    const problems = [
      ...tooLong("home", homeSeo("Pantelimon", "Clubul Tenis Elite", 4)),
      ...pageHeaderContent.flatMap((header) => tooLong(`header ${header.key}`, header)),
      ...postContent.flatMap((post) => tooLong(`post ${post.slug}`, post)),
    ];
    expect(problems).toEqual([]);
  });
});
