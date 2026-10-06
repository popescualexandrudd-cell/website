/** The AI in the panel (ADR-0019): its state, spend and tools; the latest questions, without text. */
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { fakeApi, json, mountPanel, settle } from "../test-kit";
import { AI, dollars } from "./AI";
import { MODULES, allowed } from "./index";

function mount(answers: Record<string, (body: unknown, url: URL) => Response>) {
  const api = fakeApi(answers);
  mountPanel(<AI />, api.fetchStub, ["ai.view"]);
  return api.calls;
}

afterEach(() => cleanup());

describe("AI (ADR-0019)", () => {
  it("opens with ai.view only", () => {
    expect(allowed(MODULES, (a) => a === "ai.view").map((m) => m.route)).toEqual(["ai"]);
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
            tools: [{ name: "club_info", ok: true }, { name: "helpful_helper", ok: false, error: "ai.forbidden" }],
            steps: 2,
            input_tokens: 300,
            output_tokens: 50,
            cost_micro_usd: 2200,
            created_at: "2027-03-16T08:00:00Z",
          },
        ]),
    });
    await settle();
    expect(calls.find((c) => c.path === "/api/v1/staff/ai/status")?.query).toBe("?location_id=l1");
    expect(screen.getByText("Pornit")).toBeTruthy();
    expect(screen.getByText("claude-opus-5-5")).toBeTruthy();
    expect(screen.getByText("$12.50 din $50 luna aceasta")).toBeTruthy();
    expect(screen.getByText("club_info").parentElement?.textContent).toContain("Contul clientului, Site (fără cont), Personal");
    const row = screen.getByText("club_info, helpful_helper (ai.forbidden)").closest("tr");
    expect(row?.textContent).toContain("Site (fără cont)");
    expect(row?.textContent).toContain("Răspuns");
    expect(row?.textContent).toContain("$0.00");
    expect(row?.textContent).toContain("300 intrare, 50 ieșire");
  });

  it("off, without a key, and an empty log", async () => {
    mount({
      "GET /api/v1/staff/ai/status": () =>
        json({ enabled: false, configured: false, model: "", month_cost_micro_usd: 0, budget_usd: 50, tools: {} }),
      "GET /api/v1/staff/ai/interactions": () => json([]),
    });
    await settle();
    expect(screen.getByText("Oprit")).toBeTruthy();
    expect(screen.getByText("Lipsește cheia sau modelul din .env (pe server)")).toBeTruthy();
    expect(screen.getByText("Nicio întrebare încă.")).toBeTruthy();
  });
});
