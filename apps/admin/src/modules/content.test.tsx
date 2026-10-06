/** The website's texts and their translations from the panel (§8.6, Stage 11, jungle.content). */
import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { fakeApi, json, mountPanel, settle } from "../test-kit";
import { MODULES, allowed } from "./index";
import { SiteContent, Translations } from "./SiteContent";
import { ENTRIES, fieldsOf, groupOf, GROUPS, indexChanges, matches, sameFields, translationState } from "./siteTexts";

afterEach(() => cleanup());

const TITLE = ENTRIES.find((e) => e.key === "web.meta.title");
if (!TITLE) throw new Error("web.meta.title is in the catalogue");

function change(key: string, language: string, fields: Record<string, unknown> = {}) {
  return { key, language, draft: "", published: "", published_at: null, updated_by: "Ana Pop", updated_at: "2027-03-15T07:00:00Z", ...fields };
}

describe("the website's texts in the panel (§8.6)", () => {
  it("open with content.manage", () => {
    expect(allowed(MODULES, (a) => a === "content.manage").map((m) => m.route)).toEqual(["content", "translations"]);
  });

  it("every text of the website but the legal ones, grouped, SEO first", () => {
    expect(ENTRIES.length).toBeGreaterThan(500);
    expect(ENTRIES.some((e) => e.key.startsWith("web.legal."))).toBe(false);
    expect(ENTRIES.every((e) => e.key.startsWith("web.") && e.ro && e.en)).toBe(true);
    expect(GROUPS[0]).toBe("seo");
    expect(groupOf("web.meta.title")).toBe("seo");
    expect(groupOf("web.site.pageIntro.padel")).toBe("seo");
    expect(groupOf("web.site.hero.title")).toBe("site.hero");
    expect(groupOf("web.waitlist.title")).toBe("waitlist");
    expect(matches(TITLE, "", "seo")).toBe(true);
    expect(matches(TITLE, "meta.title", "")).toBe(true);
    expect(matches(TITLE, "nimic-așa", "")).toBe(false);
    expect(matches(TITLE, "", "site.hero")).toBe(false);
  });

  it("a change keeps the fields of the text", () => {
    expect(fieldsOf("Bună, {name}! {count, plural, one {# meci} other {# meciuri}}")).toEqual(["count", "name"]);
    expect(sameFields("Bună, {name}!", "Salut, {name}!")).toBe(true);
    expect(sameFields("Bună, {name}!", "Salut!")).toBe(false);
  });

  it("what the translations need", () => {
    const entry = { key: "web.x", ro: "Teren liber", en: "Free court" };
    expect(translationState(entry, indexChanges([]))).toEqual([]);
    expect(translationState({ ...entry, en: "Teren liber" }, indexChanges([]))).toEqual(["same"]);
    expect(translationState({ ...entry, ro: "OK", en: "OK" }, indexChanges([]))).toEqual([]); // too short to tell
    const roNewer = indexChanges([
      change("web.x", "ro", { published: "Teren disponibil", published_at: "2027-03-15T08:00:00Z" }),
      change("web.x", "en", { draft: "Available court", published: "Court", published_at: "2027-03-14T08:00:00Z" }),
    ]);
    expect(translationState(entry, roNewer)).toEqual(["drafts", "roNewer"]);
    const onlyRo = indexChanges([change("web.x", "ro", { published: "Teren disponibil", published_at: "2027-03-15T08:00:00Z" })]);
    expect(translationState(entry, onlyRo)).toEqual(["roNewer"]);
  });

  it("finds a text, saves a draft, then publishes it with a reason", async () => {
    let rows = [change("web.meta.title", "ro", { published: "Jungle Padel · Club nou" })];
    const api = fakeApi({
      "GET /api/v1/staff/content/texts": () => json(rows),
      "POST /api/v1/staff/content/texts": () => {
        rows = [change("web.meta.title", "ro", { published: "Jungle Padel · Club nou", draft: "Jungle Padel · Bucureşti" })];
        return json(rows[0]);
      },
      "POST /api/v1/staff/content/texts/publish": () => json(rows[0]),
    });
    mountPanel(<SiteContent />, api.fetchStub, ["content.manage"]);
    await settle();
    expect(screen.getByRole("heading", { name: "Conținutul site-ului" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Caută (text sau cheie)"), { target: { value: "meta.title" } });
    const open = screen.getByRole("button", { name: "Jungle Padel · Club nou" });
    expect(open.parentElement?.textContent).toContain("schimbat");
    fireEvent.click(open);
    const editor = screen.getByRole("group", { name: "web.meta.title" });
    const ro = within(editor).getByRole("group", { name: "Română" });
    fireEvent.change(within(ro).getByLabelText("Română"), { target: { value: " Jungle Padel · Bucureşti " } });
    await act(async () => {
      fireEvent.click(within(ro).getByRole("button", { name: "Salvează ciorna" }));
    });
    await settle();
    expect(api.calls.find((c) => c.method === "POST")?.body).toEqual({
      location_id: "l1",
      key: "web.meta.title",
      language: "ro",
      text: "Jungle Padel · Bucureşti",
    });
    const reopened = screen.getByRole("group", { name: "web.meta.title" });
    expect(within(reopened).getByText(/are o ciornă/)).toBeTruthy();
    fireEvent.click(within(reopened).getByRole("button", { name: "Publică pe site" }));
    fireEvent.change(within(reopened).getByLabelText("Motivul"), { target: { value: "Titlul nou" } });
    await act(async () => {
      fireEvent.submit(within(reopened).getByRole("form", { name: "Publică pe site" }));
    });
    await settle();
    expect(api.calls.find((c) => c.path.endsWith("/publish"))?.body).toEqual({
      location_id: "l1",
      key: "web.meta.title",
      language: "ro",
      reason: "Titlul nou",
    });
  });

  it("refuses a text that loses its fields", async () => {
    const withField = ENTRIES.find((e) => fieldsOf(e.ro).length > 0);
    if (!withField) throw new Error("a text with a field");
    const api = fakeApi({ "GET /api/v1/staff/content/texts": () => json([]) });
    mountPanel(<SiteContent />, api.fetchStub, ["content.manage"]);
    await settle();
    fireEvent.change(screen.getByLabelText("Partea site-ului"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Caută (text sau cheie)"), { target: { value: withField.key } });
    fireEvent.click(screen.getAllByRole("button", { name: withField.ro })[0] as HTMLElement);
    const ro = within(screen.getByRole("group", { name: withField.key })).getByRole("group", { name: "Română" });
    fireEvent.change(within(ro).getByLabelText("Română"), { target: { value: "Fără câmpuri" } });
    expect(within(ro).getByRole("alert").textContent).toContain("câmpurile");
    expect((within(ro).getByRole("button", { name: "Salvează ciorna" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Caută (text sau cheie)"), { target: { value: "nimic-așa-ceva" } });
    expect(screen.getByText("Niciun text găsit.")).toBeTruthy();
  });

  it("translations: drafts to approve, discard and the original text back", async () => {
    const rows = [change("web.meta.title", "en", { draft: "Jungle Padel · Bucharest", published: "Jungle Padel" })];
    const api = fakeApi({
      "GET /api/v1/staff/content/texts": () => json(rows),
      "POST /api/v1/staff/content/texts/discard": () => json({ ok: true }),
      "POST /api/v1/staff/content/texts/restore": () => json({ ok: true }),
    });
    mountPanel(<Translations />, api.fetchStub, ["content.manage"]);
    await settle();
    expect(screen.getByRole("button", { name: "De aprobat (1)" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getAllByRole("button", { name: TITLE.ro })[0] as HTMLElement);
    const en = within(screen.getByRole("group", { name: "web.meta.title" })).getByRole("group", { name: "Engleză" });
    expect((within(en).getByLabelText("Engleză") as HTMLTextAreaElement).value).toBe("Jungle Padel · Bucharest");
    await act(async () => {
      fireEvent.click(within(en).getByRole("button", { name: "Renunță la ciornă" }));
    });
    await settle();
    expect(api.calls.find((c) => c.path.endsWith("/discard"))?.body).toEqual({ location_id: "l1", key: "web.meta.title", language: "en", reason: "" });
    fireEvent.click(screen.getByRole("button", { name: /Identice cu româna/ }));
    expect(screen.getByText(/probabil netradus/)).toBeTruthy();
  });
});
