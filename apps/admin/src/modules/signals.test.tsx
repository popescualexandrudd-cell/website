/** Signals and demand (§10, Stage 12F): what may be worth a look, and how full the courts were,
 * with suggestions that stay proposals. */
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { fakeApi, json, mountPanel, settle } from "../test-kit";
import { MODULES, allowed } from "./index";
import { hours, Signals } from "./Signals";

afterEach(() => cleanup());

const demand = {
  first: "2027-02-15",
  last: "2027-03-14",
  bands: [
    {
      band: "peak",
      booked_minutes: 16800,
      open_minutes: 16800,
      percent: 100,
      suggestion: "raise",
      step_percent: 10,
    },
    {
      band: "semi_peak",
      booked_minutes: 3360,
      open_minutes: 6720,
      percent: 50,
      suggestion: "",
      step_percent: 10,
    },
    {
      band: "off_peak",
      booked_minutes: 0,
      open_minutes: 13440,
      percent: 0,
      suggestion: "lower",
      step_percent: 10,
    },
  ],
  outlook: [
    { day: "2027-03-15", booked_minutes: 90, open_minutes: 1800, percent: 5 },
  ],
};

function mount(signals: unknown[]) {
  const api = fakeApi({
    "GET /api/v1/staff/panel/signals": () => json(signals),
    "GET /api/v1/staff/panel/demand": () => json(demand),
  });
  mountPanel(<Signals />, api.fetchStub, ["reports.view"]);
  return api.calls;
}

describe("signals and demand (§10)", () => {
  it("opens with reports.view", () => {
    expect(
      allowed(MODULES, (a) => a === "reports.view").map((m) => m.route),
    ).toEqual(["reports", "signals"]);
  });

  it("hours as people read them", () => {
    expect(hours(90, "ro")).toBe("1,5");
    expect(hours(90, "en")).toBe("1.5");
    expect(hours(120, "ro")).toBe("2");
  });

  it("lists the signals and the demand by band, with proposals only", async () => {
    const calls = mount([
      {
        kind: "league.repeated",
        params: { names: "Ana Pop, Bia Pop", count: 4, days: 7 },
        at: "2027-03-14T18:00:00Z",
      },
      {
        kind: "cash.difference",
        params: { device: "Chioșc Plăți 1", amount: "−7,50 lei", who: "Maria" },
        at: null,
      },
    ]);
    await settle();
    expect(calls.map((c) => c.query)).toEqual([
      "?location_id=l1",
      "?location_id=l1",
    ]);
    expect(
      screen.getByText(
        /Aceiași patru jucători, 4 meciuri de ligă în 7 zile: Ana Pop, Bia Pop\./,
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Diferență la numărarea casei Chioșc Plăți 1: −7,50 lei (numărat de Maria).",
      ),
    ).toBeTruthy();
    const peak = screen.getByRole("row", { name: /Vârf/ });
    expect(peak.textContent).toContain("100% (280 din 280 ore)");
    expect(peak.textContent).toContain("Prețul ar putea crește cu 10%");
    expect(
      screen.getByRole("row", { name: /Semi-vârf/ }).textContent,
    ).toContain("—");
    expect(
      screen.getByRole("row", { name: /În afara vârfului/ }).textContent,
    ).toContain("Prețul ar putea scădea cu 10%");
    expect(screen.getByText(/doar propuneri/)).toBeTruthy();
    expect(screen.getByText("5% (1,5 din 30 ore)")).toBeTruthy();
  });

  it("no signals", async () => {
    mount([]);
    await settle();
    expect(screen.getByText("Niciun semnal acum.")).toBeTruthy();
  });
});
