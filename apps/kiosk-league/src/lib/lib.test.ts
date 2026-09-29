import { describe, expect, it, vi } from "vitest";
import { ApiError, kioskApi } from "./api";
import { errorText, formatTime, t } from "./i18n";
import { describe as describeScore, emptySet, limit, needsTiebreak, teamsValid, toScore } from "./score";

describe("i18n (RO/EN, club time)", () => {
  it("formats kiosk texts with ICU parameters", () => {
    expect(t("ro", "session.hello", { name: "Ana" })).toBe("Salut, Ana!");
    expect(t("en", "session.hello", { name: "Ana" })).toBe("Hi, Ana!");
    expect(t("ro", "actions.count", { count: 3 })).toBe("3 de făcut");
    expect(t("en", "nu.exista")).toBe("nu.exista");
  });

  it("translates API error codes, times in Europe/Bucharest (ADR-0010)", () => {
    const text = errorText("ro", "league.window_not_open", {
      opens: "2027-04-05T08:00:00Z",
      closes: "2027-04-05T08:30:00Z",
    });
    expect(text).toBe("Scorul se poate introduce între 11:00 și 11:30.");
    expect(errorText("en", "cards.invalid")).toMatch(/card/);
    expect(errorText("ro", "league.players_not_scanned", { missing: ["Ana", "Ion"] })).toContain("Ana, Ion");
    expect(errorText("ro", "cod.necunoscut")).toBe(t("ro", "errors.generic"));
    expect(formatTime("en", "2027-03-28T10:00:00Z")).toBe("13:00"); // after the change to summer time
  });
});

describe("score entry (§6.7, §6.8)", () => {
  it("builds the score the server validates", () => {
    const tie = { ...emptySet(), a: 7, b: 6, tbA: 7, tbB: 4 };
    expect(needsTiebreak(tie)).toBe(true);
    expect(needsTiebreak({ ...tie, superTiebreak: true })).toBe(false);
    expect(limit(emptySet())).toBe(7);
    expect(limit({ ...emptySet(), superTiebreak: true })).toBe(30);
    const score = toScore([{ ...emptySet(), a: 6, b: 3 }, tie], false);
    expect(score).toEqual({
      sets: [
        { a: 6, b: 3, tiebreak: null, super_tiebreak: false },
        { a: 7, b: 6, tiebreak: [7, 4], super_tiebreak: false },
      ],
      unfinished: false,
    });
    expect(describeScore(score)).toBe("6–3, 7–6 (7–4)");
    expect(describeScore({})).toBe("");
    expect(teamsValid(["a", "b"], ["c", "d"])).toBe(true);
    expect(teamsValid(["a"], ["c", "d"])).toBe(false);
    expect(teamsValid([], [])).toBe(false);
  });
});

describe("API client", () => {
  const response = (status: number, body: unknown) =>
    new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  it("sends the device token and turns refusals into stable codes", async () => {
    const seen: Request[] = [];
    const fetchImpl = vi.fn(async (input: Request) => {
      seen.push(input);
      return response(403, { error: { code: "league.score_kiosk_only", params: {} } });
    });
    const api = kioskApi("http://club/api/v1/", "dev.secret", fetchImpl as unknown as typeof fetch);
    const error = await api.idle().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("league.score_kiosk_only");
    expect(seen[0]?.url).toBe("http://club/api/v1/kiosk/league/idle");
    expect(seen[0]?.headers.get("X-Device-Token")).toBe("dev.secret");
  });
});

describe("rank names (§6.5)", () => {
  it("translates tiers and divisions", async () => {
    const { rankName } = await import("./i18n");
    expect(rankName("ro", "gold", "II")).toBe("Aur II");
    expect(rankName("en", "master", "")).toBe("Master");
    expect(rankName("ro", "", "")).toBe("");
  });
});
