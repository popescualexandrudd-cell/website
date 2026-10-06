/** The AI in the panel (ADR-0019): its state, spend and tools; the latest questions, without text. */
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { fakeApi, json, mountPanel, settle } from "../test-kit";
import type { ReactNode } from "react";
import { AI, dollars } from "./AI";
import { AIDrafts } from "./AIDrafts";
import { MODULES, allowed } from "./index";

function mount(
  answers: Record<string, (body: unknown, url: URL) => Response>,
  actions = ["ai.view"],
  ui: ReactNode = <AI />,
) {
  const api = fakeApi(answers);
  mountPanel(ui, api.fetchStub, actions);
  return api.calls;
}

const OFF = {
  "GET /api/v1/staff/ai/status": () =>
    json({
      enabled: true,
      configured: true,
      model: "fake-club",
      month_cost_micro_usd: 0,
      budget_usd: 50,
      tools: {},
    }),
  "GET /api/v1/staff/ai/interactions": () => json([]),
};

function draft(id: string, fields: Record<string, unknown> = {}) {
  return {
    id,
    kind: "community",
    language: "ro",
    request: "Anunță seara cu DJ",
    body: "Sâmbătă: seară cu DJ!",
    status: "to_review",
    requested_by: "Ana Pop",
    created_at: "2027-03-16T08:00:00Z",
    reviewed_at: null,
    ...fields,
  };
}

afterEach(() => cleanup());

describe("AI (ADR-0019)", () => {
  it("opens with ai.view only", () => {
    expect(
      allowed(MODULES, (a) => a === "ai.view").map((m) => m.route),
    ).toEqual(["ai"]);
  });

  it("money in dollars from millionths", () => {
    expect(dollars(1_250_000)).toBe("$1.25");
    expect(dollars(800)).toBe("$0.00");
  });

  it("shows the state, the spend against the limit, the tools and the log", async () => {
    const calls = mount({
      "GET /api/v1/staff/ai/status": () =>
        json({
          enabled: true,
          configured: true,
          model: "claude-opus-5-5",
          month_cost_micro_usd: 12_500_000,
          budget_usd: 50,
          tools: { club_info: ["member", "public", "staff"] },
        }),
      "GET /api/v1/staff/ai/interactions": () =>
        json([
          {
            id: "i1",
            context: "public",
            outcome: "answered",
            model: "claude-opus-5-5",
            tools: [
              { name: "club_info", ok: true },
              { name: "helpful_helper", ok: false, error: "ai.forbidden" },
            ],
            steps: 2,
            input_tokens: 300,
            output_tokens: 50,
            cost_micro_usd: 2200,
            created_at: "2027-03-16T08:00:00Z",
          },
        ]),
    });
    await settle();
    expect(calls.find((c) => c.path === "/api/v1/staff/ai/status")?.query).toBe(
      "?location_id=l1",
    );
    expect(screen.getByText("Pornit")).toBeTruthy();
    expect(screen.getByText("claude-opus-5-5")).toBeTruthy();
    expect(screen.getByText("$12.50 din $50 luna aceasta")).toBeTruthy();
    expect(screen.getByText("club_info").parentElement?.textContent).toContain(
      "Contul clientului, Site (fără cont), Personal",
    );
    const row = screen
      .getByText("club_info, helpful_helper (ai.forbidden)")
      .closest("tr");
    expect(row?.textContent).toContain("Site (fără cont)");
    expect(row?.textContent).toContain("Răspuns");
    expect(row?.textContent).toContain("$0.00");
    expect(row?.textContent).toContain("300 intrare, 50 ieșire");
  });

  it("off, without a key, and an empty log", async () => {
    mount({
      "GET /api/v1/staff/ai/status": () =>
        json({
          enabled: false,
          configured: false,
          model: "",
          month_cost_micro_usd: 0,
          budget_usd: 50,
          tools: {},
        }),
      "GET /api/v1/staff/ai/interactions": () => json([]),
    });
    await settle();
    expect(screen.getByText("Oprit")).toBeTruthy();
    expect(
      screen.getByText("Lipsește cheia sau modelul din .env (pe server)"),
    ).toBeTruthy();
    expect(screen.getByText("Nicio întrebare încă.")).toBeTruthy();
  });

  it("the copilot only with ai.copilot; the drafts in the Community module", async () => {
    mount(OFF);
    await settle();
    expect(screen.queryByRole("heading", { name: "Copilotul" })).toBeNull();
    expect(
      allowed(MODULES, (a) => a === "ai.drafts").map((m) => m.route),
    ).toEqual(["community"]);
  });

  it("the copilot answers and shows what it read", async () => {
    const calls = mount(
      {
        ...OFF,
        "POST /api/v1/staff/ai/ask": () =>
          json({
            text: "Săptămâna trecută: 12 rezervări.",
            outcome: "answered",
            reads: [
              {
                name: "club_numbers",
                input: { first: "2027-03-08", last: "2027-03-14" },
                ok: true,
              },
              { name: "club_signals", input: {}, ok: false },
            ],
          }),
      },
      ["ai.view", "ai.copilot"],
    );
    await settle();
    expect(screen.getByRole("heading", { name: "Copilotul" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Întrebarea"), {
      target: { value: " Cum a mers săptămâna? " },
    });
    await act(async () => {
      fireEvent.submit(screen.getByRole("form", { name: "Copilotul" }));
    });
    await settle();
    const asked = calls.find((c) => c.path === "/api/v1/staff/ai/ask");
    expect(asked?.body).toEqual({
      location_id: "l1",
      messages: [{ role: "user", content: "Cum a mers săptămâna?" }],
    });
    expect(screen.getByText("Săptămâna trecută: 12 rezervări.")).toBeTruthy();
    expect(screen.getByText("club_numbers")).toBeTruthy();
    expect(
      screen.getByText('{"first":"2027-03-08","last":"2027-03-14"}'),
    ).toBeTruthy();
    expect(screen.getByText(/nu a putut citi/)).toBeTruthy();
  });

  it("the copilot says why there is no answer", async () => {
    mount(
      {
        ...OFF,
        "POST /api/v1/staff/ai/ask": () =>
          json({ text: "", outcome: "budget", reads: [] }),
      },
      ["ai.view", "ai.copilot"],
    );
    await settle();
    fireEvent.change(screen.getByLabelText("Întrebarea"), {
      target: { value: "Cifrele?" },
    });
    await act(async () => {
      fireEvent.submit(screen.getByRole("form", { name: "Copilotul" }));
    });
    await settle();
    expect(screen.getByText("Limita lunară a AI-ului e atinsă.")).toBeTruthy();
  });

  it("asks for a draft, then approves it corrected or discards it", async () => {
    const calls = mount(
      {
        ...OFF,
        "GET /api/v1/staff/ai/drafts": () =>
          json([
            draft("d1"),
            draft("d2", {
              kind: "article",
              status: "approved",
              body: "Articol aprobat",
            }),
          ]),
        "POST /api/v1/staff/ai/drafts": () => json(draft("d3"), 201),
        "POST /api/v1/staff/ai/drafts/d1/review": () =>
          json(draft("d1", { status: "approved" })),
      },
      ["ai.drafts"],
      <AIDrafts />,
    );
    await settle();
    expect(
      screen.getByRole("heading", { name: "Comunitate: ciorne scrise de AI" }),
    ).toBeTruthy();
    expect(screen.getByText("De revizuit")).toBeTruthy();
    expect(screen.getByText("Articol aprobat")).toBeTruthy();
    expect(screen.getAllByText(/Cerut de Ana Pop/)[0]?.textContent).toContain(
      "„Anunță seara cu DJ”",
    );

    const form = screen.getByRole("form", { name: "Scrie ciorna" });
    fireEvent.change(within(form).getByLabelText("Ce să scrie"), {
      target: { value: "translation" },
    });
    fireEvent.change(within(form).getByLabelText("În limba"), {
      target: { value: "en" },
    });
    fireEvent.change(within(form).getByLabelText("Textul de tradus"), {
      target: { value: " Sâmbătă: seară cu DJ. " },
    });
    await act(async () => {
      fireEvent.submit(form);
    });
    await settle();
    const asked = calls.find(
      (c) => c.method === "POST" && c.path === "/api/v1/staff/ai/drafts",
    );
    expect(asked?.body).toEqual({
      location_id: "l1",
      kind: "translation",
      language: "en",
      text: "Sâmbătă: seară cu DJ.",
    });

    fireEvent.change(screen.getByLabelText("Textul ciornei"), {
      target: { value: "Sâmbătă: seară cu DJ, de la 20:00!" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Aprobă" }));
    });
    await settle();
    const reviewed = calls.find(
      (c) => c.path === "/api/v1/staff/ai/drafts/d1/review",
    );
    expect(reviewed?.body).toEqual({
      status: "approved",
      body: "Sâmbătă: seară cu DJ, de la 20:00!",
    });
  });

  it("discards without sending a text", async () => {
    const calls = mount(
      {
        ...OFF,
        "GET /api/v1/staff/ai/drafts": () => json([draft("d1")]),
        "POST /api/v1/staff/ai/drafts/d1/review": () =>
          json(draft("d1", { status: "discarded" })),
      },
      ["ai.drafts"],
      <AIDrafts />,
    );
    await settle();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Renunță" }));
    });
    await settle();
    expect(
      calls.find((c) => c.path === "/api/v1/staff/ai/drafts/d1/review")?.body,
    ).toEqual({ status: "discarded" });
  });
});
