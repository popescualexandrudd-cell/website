import { beforeEach, describe, expect, it, vi } from "vitest";

const mode = vi.hoisted(() => ({ value: "prelaunch" as "prelaunch" | "full" }));
vi.mock("@/lib/flags", () => ({ siteMode: async () => mode.value }));
vi.mock("@/lib/blog", () => ({
  articles: async () => [
    { slug: "ce-este-padelul", updated_at: "2027-02-01T10:00:00Z", demo: false },
    { slug: "articol-demo", updated_at: "2027-02-01T10:00:00Z", demo: true },
  ],
}));

import sitemap from "./sitemap";

describe("the sitemap (§15.1)", () => {
  beforeEach(() => {
    mode.value = "prelaunch";
  });

  it("before the launch: the home page and the legal texts, each with its other language", async () => {
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toHaveLength(12);
    expect(urls.some((u) => u.endsWith("/ro/termeni-si-conditii"))).toBe(true);
    expect(urls.some((u) => u.includes("/padel"))).toBe(false);
    const home = (await sitemap())[0];
    expect(home?.alternates?.languages).toEqual({ ro: expect.stringMatching(/\/ro$/), en: expect.stringMatching(/\/en$/) });
  });

  it("the full site: its pages and the real articles, never the account or a demo article", async () => {
    mode.value = "full";
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.endsWith("/ro/liga"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/en/league"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/ro/rezervari"))).toBe(true);
    expect(urls.some((u) => /\/(cont|account)(\/|$)/.test(u))).toBe(false);
    expect(urls.filter((u) => u.includes("/blog/ce-este-padelul"))).toHaveLength(2);
    expect(urls.some((u) => u.includes("articol-demo"))).toBe(false);
    expect(entries.find((e) => e.url.endsWith("/ro/blog/ce-este-padelul"))?.lastModified).toBe("2027-02-01T10:00:00Z");
  });
});
