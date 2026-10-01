/** The club's blog in the panel (§9.3 `/blog`): write, correct, publish, withdraw, delete a draft. */
import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Call, fakeApi, json, mountPanel, settle } from "../test-kit";
import { Blog, slugOf } from "./Blog";
import { MODULES, allowed } from "./index";

let answers: Record<string, (body: unknown, url: URL) => Response>;
let calls: Call[];

function mount(actions = ["blog.manage"]) {
  const api = fakeApi(answers);
  calls = api.calls;
  return mountPanel(<Blog />, api.fetchStub, actions);
}

const last = (method: string, path: string) => calls.filter((c) => c.method === method && c.path === path).at(-1);

const article = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  slug: `articol-${id}`,
  title_ro: `Articolul ${id}`,
  title_en: `Article ${id}`,
  summary_ro: "Rezumat",
  summary_en: "Summary",
  body_ro: "## Text",
  body_en: "## Text",
  published: false,
  first_published_at: null,
  updated_at: "2027-03-16T08:00:00Z",
  is_demo: false,
  ...extra,
});

async function withReason(button: string, scope: HTMLElement, reason = "motiv scris") {
  fireEvent.click(within(scope).getByRole("button", { name: button }));
  fireEvent.change(within(scope).getByLabelText("Motivul"), { target: { value: reason } });
  await act(async () => {
    fireEvent.submit(within(scope).getByRole("form", { name: button }));
  });
  await settle();
}

beforeEach(() => {
  answers = {};
});

afterEach(() => cleanup());

describe("the blog (§9.3)", () => {
  it("an address from a title: lowercase, no diacritics, dashes", () => {
    expect(slugOf("Ce este padelul? Reguli, pe scurt!")).toBe("ce-este-padelul-reguli-pe-scurt");
    expect(slugOf("  Șapte greșeli în ligă  ")).toBe("sapte-greseli-in-liga");
    expect(slugOf("x".repeat(79) + "-yy")).toBe("x".repeat(79));
    expect(slugOf("!!!")).toBe("");
  });

  it("opens with blog.manage only", () => {
    expect(allowed(MODULES, (a) => a === "blog.manage").map((m) => m.route)).toEqual(["blog"]);
  });

  it("write a draft (the address from the title), publish, withdraw, delete a draft", async () => {
    answers = {
      "GET /api/v1/staff/blog": () =>
        json([
          article("a1"),
          article("a2", { published: true, first_published_at: "2027-03-10T08:00:00Z", is_demo: true }),
          article("a3", { first_published_at: "2027-03-01T08:00:00Z" }),
        ]),
      "POST /api/v1/staff/blog": () => json(article("a4"), 201),
      "POST /api/v1/staff/blog/a1/publication": () => json(article("a1", { published: true })),
      "POST /api/v1/staff/blog/a2/publication": () => json(article("a2")),
      "POST /api/v1/staff/blog/a1/delete": () => json({ ok: true }),
    };
    const panel = mount();
    await settle();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((r) => within(r).getAllByRole("cell")[0]?.textContent)).toEqual([
      "Ciornă",
      "Publicat · 10 mar. 2027",
      "Retras de pe site · 1 mar. 2027",
    ]);
    expect(within(rows[1] as HTMLElement).getByRole("rowheader").textContent).toContain("DEMO");
    // Only a draft never published can be deleted.
    expect(within(rows[0] as HTMLElement).queryByRole("button", { name: "Șterge ciorna" })).toBeTruthy();
    expect(within(rows[2] as HTMLElement).queryByRole("button", { name: "Șterge ciorna" })).toBeNull();

    const form = screen.getByRole("form", { name: "Articol nou" });
    fireEvent.change(within(form).getByLabelText("Titlul (română)"), { target: { value: "Ce este padelul" } });
    expect((within(form).getByLabelText("Adresa (/blog/…)") as HTMLInputElement).value).toBe("ce-este-padelul");
    for (const [label, value] of [
      ["Titlul (engleză)", "What padel is"],
      ["Rezumatul (română)", "Pe scurt"],
      ["Rezumatul (engleză)", "In short"],
      ["Textul (română)", "## Terenul"],
      ["Textul (engleză)", "## The court"],
    ]) {
      fireEvent.change(within(form).getByLabelText(label as string), { target: { value } });
    }
    fireEvent.click(within(form).getByLabelText("Publică imediat pe site"));
    await act(async () => {
      fireEvent.submit(form);
    });
    await settle();
    expect(last("POST", "/api/v1/staff/blog")?.body).toEqual({
      slug: "ce-este-padelul",
      title_ro: "Ce este padelul",
      title_en: "What padel is",
      summary_ro: "Pe scurt",
      summary_en: "In short",
      body_ro: "## Terenul",
      body_en: "## The court",
      location_id: "l1",
      published: true,
    });
    expect(panel.notify).toHaveBeenCalledWith("Articolul e creat.");

    await withReason("Publică", rows[0] as HTMLElement);
    expect(last("POST", "/api/v1/staff/blog/a1/publication")?.body).toEqual({ published: true, reason: "motiv scris" });
    await withReason("Retrage de pe site", screen.getAllByRole("row")[2] as HTMLElement);
    expect(last("POST", "/api/v1/staff/blog/a2/publication")?.body).toEqual({ published: false, reason: "motiv scris" });
    await withReason("Șterge ciorna", screen.getAllByRole("row")[1] as HTMLElement, "dublură");
    expect(last("POST", "/api/v1/staff/blog/a1/delete")?.body).toEqual({ reason: "dublură" });
    expect(panel.notify).toHaveBeenCalledWith("Ciorna a fost ștearsă.");
  });

  it("a correction with a reason; a published article keeps its address", async () => {
    answers = {
      "GET /api/v1/staff/blog": () => json([article("a2", { published: true, first_published_at: "2027-03-10T08:00:00Z" })]),
      "PUT /api/v1/staff/blog/a2": () => json({ error: { code: "blog.slug_locked", params: {} } }, 409),
    };
    const panel = mount();
    await settle();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Modifică" })));
    const form = screen.getByRole("form", { name: "Modifică articolul" });
    const slug = within(form).getByLabelText("Adresa (/blog/…)") as HTMLInputElement;
    expect(slug.readOnly).toBe(true);
    expect(within(form).getByText(/adresa nu se mai schimbă/)).toBeTruthy();
    fireEvent.change(within(form).getByLabelText("Titlul (română)"), { target: { value: "Titlu corectat" } });
    expect(slug.value).toBe("articol-a2"); // the title no longer changes the address
    fireEvent.change(within(form).getByLabelText("Motivul"), { target: { value: " greșeală de tipar " } });
    await act(async () => {
      fireEvent.submit(form);
    });
    await settle();
    expect(last("PUT", "/api/v1/staff/blog/a2")?.body).toMatchObject({ title_ro: "Titlu corectat", slug: "articol-a2", reason: "greșeală de tipar" });
    expect(panel.fail).toHaveBeenCalled();
    await act(async () => fireEvent.click(within(form).getByRole("button", { name: "Renunț" })));
    expect(screen.getByRole("form", { name: "Articol nou" })).toBeTruthy();
  });

  it("an empty blog says so", async () => {
    answers = { "GET /api/v1/staff/blog": () => json([]) };
    mount();
    await settle();
    expect(screen.getByText("Nu e niciun articol încă.")).toBeTruthy();
  });
});
