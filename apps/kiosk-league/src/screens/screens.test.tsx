import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { KioskApi, Session } from "../lib/api";
import { KioskContext, type Kiosk } from "../kiosk";
import { Confirm } from "./Confirm";
import { Consent } from "./Consent";
import { Fixtures } from "./Fixtures";
import { Home } from "./Home";
import { ScoreEntry } from "./ScoreEntry";

afterEach(cleanup);

const person = (id: string, first: string) => ({ id, first_name: first, last_name: "Demo" });

function session(changes: Partial<Session> = {}): Session {
  return {
    session: "s-1",
    player: person("p1", "Ana"),
    language: "ro",
    adult: true,
    consent_signed: true,
    consent_outdated: false,
    questionnaire: "validated",
    in_league: true,
    director: false,
    ladders: [
      {
        ladder: "doubles",
        position: 3,
        tier: "gold",
        division: "II",
        level: 3.2,
        lp: 45,
        placement_left: 0,
        matches_played: 6,
        minimum: 10,
      },
    ],
    score_chances: [],
    to_confirm: [],
    challenges: [],
    fixtures: [],
    ...changes,
  };
}

function mount(ui: React.ReactNode, current: Session, api: Record<string, unknown> = {}) {
  const kiosk: Kiosk = {
    lang: "ro",
    api: api as unknown as KioskApi,
    session: current,
    card: { session: current.session },
    goto: vi.fn(),
    refresh: vi.fn(async () => undefined),
    notify: vi.fn(),
    fail: vi.fn(),
    takeNextScan: vi.fn(),
    logout: vi.fn(),
  };
  render(<KioskContext.Provider value={kiosk}>{ui}</KioskContext.Provider>);
  return kiosk;
}

describe("§8.2 the player's session", () => {
  it("shows the minimal private summary and what waits", () => {
    const kiosk = mount(<Home />, session({ to_confirm: [{} as Session["to_confirm"][number]] }));
    expect(screen.getByRole("heading", { name: "Salut, Ana!" })).toBeTruthy();
    expect(screen.getByText(/Locul 3/)).toBeTruthy();
    expect(screen.getByText(/6 din 10 meciuri minime/)).toBeTruthy();
    expect(screen.queryByText("Înscriere în ligă (GDPR)")).toBeNull();
    expect(screen.getByText("1 de făcut")).toBeTruthy();
    fireEvent.click(screen.getByText("Confirmă sau contestă"));
    expect(kiosk.goto).toHaveBeenCalledWith("confirm");
  });

  it("a newcomer is offered the consent; a minor is not (R-006, R-010)", () => {
    mount(<Home />, session({ in_league: false, consent_signed: false, ladders: [], questionnaire: "none" }));
    expect(screen.getByText("Înscriere în ligă (GDPR)")).toBeTruthy();
    expect(screen.queryByText("Introdu scorul")).toBeNull();
    cleanup();
    mount(<Home />, session({ in_league: false, consent_signed: false, adult: false, ladders: [] }));
    expect(screen.queryByText("Înscriere în ligă (GDPR)")).toBeNull();
    expect(screen.getByText("Liga este pentru jucători de peste 18 ani.")).toBeTruthy();
  });

  it("check-in from the session", async () => {
    const checkIn = vi.fn(async () => ({ first_name: "Ana", scanned_at: "2027-04-05T07:00:00Z" }));
    const kiosk = mount(<Home />, session(), { checkIn });
    await act(async () => fireEvent.click(screen.getByText("Check-in")));
    expect(checkIn).toHaveBeenCalledWith({ session: "s-1" });
    expect(kiosk.notify).toHaveBeenCalledWith("Bine ai venit, Ana! Check-in făcut la 10:00.");
  });
});

describe("§8.2 actions", () => {
  it("the consent is signed only with the box ticked (R-010)", async () => {
    const consentText = vi.fn(async () => ({ kind: "league_gdpr", version: 2, language: "ro", title: "Acord", body: "Text" }));
    const signConsent = vi.fn(async () => ({ signed: true, version: 2 }));
    const kiosk = mount(<Consent />, session({ consent_signed: false }), { consentText, signConsent });
    await act(async () => undefined);
    const submit = screen.getByText("Semnez acordul") as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText("Am citit și sunt de acord"));
    await act(async () => fireEvent.click(submit));
    expect(signConsent).toHaveBeenCalledWith({ session: "s-1" }, "ro");
    expect(kiosk.notify).toHaveBeenCalled();
    expect(kiosk.goto).toHaveBeenCalledWith("home");
  });

  it("enters a score set by set with the teams (§6.7)", async () => {
    const propose = vi.fn(async () => ({}));
    const chance = {
      booking_id: "b-1",
      court: "Teren 1",
      starts_at: "2027-04-05T07:00:00Z",
      ends_at: "2027-04-05T08:30:00Z",
      window_closes_at: "2027-04-05T09:00:00Z",
      kind: "official",
      players: [person("p2", "Ion"), person("p1", "Ana"), person("p3", "Eva"), person("p4", "Dan")],
    };
    mount(<ScoreEntry />, session({ score_chances: [chance] }), { propose });
    expect(screen.getByText(/până la 12:00/)).toBeTruthy();
    const more = (label: string, times: number) => {
      for (let i = 0; i < times; i++) fireEvent.click(screen.getByLabelText(`${label}: Mai mult`));
    };
    more("Setul 1 A", 6);
    more("Setul 1 B", 3);
    more("Setul 2 A", 6);
    more("Setul 2 B", 4);
    await act(async () => fireEvent.click(screen.getByText("Trimite scorul")));
    expect(propose).toHaveBeenCalledWith({ session: "s-1" }, "b-1", ["p1", "p2"], ["p3", "p4"], {
      sets: [
        { a: 6, b: 3, tiebreak: null, super_tiebreak: false },
        { a: 6, b: 4, tiebreak: null, super_tiebreak: false },
      ],
      unfinished: false,
    });
    fireEvent.click(screen.getByText("Ion Demo"));
    expect(screen.getByText(/Fiecare echipă/)).toBeTruthy();
    expect((screen.getByText("Trimite scorul") as HTMLButtonElement).disabled).toBe(true);
  });

  it("nothing to enter: the reason is explained", () => {
    mount(<ScoreEntry />, session());
    expect(screen.getByText(/Nu ai niciun meci terminat/)).toBeTruthy();
  });

  it("confirms or disputes (LG-095)", async () => {
    const respond = vi.fn(async () => ({}));
    const match = {
      match_id: "m-1",
      team_a: [person("p1", "Ana")],
      team_b: [person("p2", "Ion")],
      score: { sets: [{ a: 6, b: 2 }, { a: 6, b: 1 }] },
      window_closes_at: "2027-04-05T09:00:00Z",
      kind: "official",
    };
    const kiosk = mount(<Confirm />, session({ to_confirm: [match] }), { respond });
    expect(screen.getByText("6–2, 6–1")).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByText("Contest scorul")));
    expect(respond).toHaveBeenCalledWith("m-1", { session: "s-1" }, false);
    expect(kiosk.notify).toHaveBeenCalledWith("Ai contestat scorul. Un administrator va verifica.");
  });
});

describe("Q28 tournament matches", () => {
  const fixture = {
    fixture_id: "f-1",
    tournament: "Cupa Junglei",
    phase: "final",
    status: "finished",
    team_a: [person("p1", "Ana")],
    team_b: [person("p2", "Ion")],
  };

  it("the director validates a score a player entered", async () => {
    const director = vi.fn(async () => ({}));
    const waiting = { ...fixture, match_id: "m-9", score: { sets: [{ a: 6, b: 4 }, { a: 6, b: 4 }] } };
    const kiosk = mount(<Fixtures />, session({ director: true, fixtures: [waiting] }), { director });
    expect(screen.getByText("Scor introdus: 6–4, 6–4")).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByText("Validez scorul (director)")));
    expect(director).toHaveBeenCalledWith("m-9", { session: "s-1" });
    expect(kiosk.notify).toHaveBeenCalledWith("Scorul a fost validat de director.");
  });

  it("a player marks the match finished, then enters the score", async () => {
    const fixtureFinished = vi.fn(async () => ({}));
    const fixtureScore = vi.fn(async () => ({}));
    mount(<Fixtures />, session({ fixtures: [{ ...fixture, status: "ready" }] }), { fixtureFinished });
    await act(async () => fireEvent.click(screen.getByText("Meciul s-a terminat")));
    expect(fixtureFinished).toHaveBeenCalledWith("f-1", { session: "s-1" });
    cleanup();
    mount(<Fixtures />, session({ fixtures: [fixture] }), { fixtureScore });
    fireEvent.click(screen.getByText("Introdu scorul"));
    expect(screen.queryByText("Meciul nu s-a terminat (ex. s-a terminat timpul)")).toBeNull(); // LG-084
    await act(async () => fireEvent.click(screen.getByText("Trimite scorul")));
    expect(fixtureScore).toHaveBeenCalledWith("f-1", { session: "s-1" }, expect.objectContaining({ unfinished: false }));
  });
});
