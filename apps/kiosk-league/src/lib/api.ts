/**
 * The League Kiosk API (`/api/v1/kiosk/league`), typed from the backend's OpenAPI schema.
 * Every call carries the device token (ADR-0012); no cookies. A network failure or a server
 * error becomes `Offline` (the kiosk shows "temporarily unavailable" and retries); any other
 * refusal becomes `ApiError` with the stable code, translated on screen.
 */
import type { components, paths } from "@jungle/api-client";
import createClient from "openapi-fetch";

type Schemas = components["schemas"];
export type Card = Schemas["CardIn"];
export type Session = Schemas["KioskSessionOut"];
export type Idle = Schemas["IdleOut"];
export type Standing = Schemas["StandingOut"];
export type ConsentText = Schemas["ConsentTextOut"];
export type Match = Schemas["MatchOut"];
export type Challenge = Schemas["ChallengeOut"];
export type Person = Schemas["PersonOut"];
export type Ladder = "doubles" | "singles" | "pairs";
export type Score = {
  sets: { a: number; b: number; tiebreak?: [number, number] | null; super_tiebreak?: boolean }[];
  unfinished: boolean;
};

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly params: Record<string, unknown>,
    readonly status: number,
  ) {
    super(code);
  }
}

export class Offline extends Error {}

type Result<T> = { data?: T; error?: unknown; response: Response };

export async function unwrap<T>(call: Promise<Result<T>>): Promise<T> {
  let result: Result<T>;
  try {
    result = await call;
  } catch {
    throw new Offline("network");
  }
  const { response } = result;
  if (response.status >= 500) throw new Offline(`status ${response.status}`);
  if (!response.ok) {
    const body = result.error as Schemas["ErrorOut"] | undefined;
    throw new ApiError(body?.error?.code ?? "unknown", body?.error?.params ?? {}, response.status);
  }
  return result.data as T;
}

/** `apiUrl` is the API root (…/api/v1); the schema's paths already start with /api/v1. */
export function kioskApi(apiUrl: string, deviceToken: string, fetchImpl?: typeof fetch) {
  const client = createClient<paths>({
    baseUrl: apiUrl.replace(/\/+$/, "").replace(/\/api\/v1$/, ""),
    headers: { "X-Device-Token": deviceToken },
    ...(fetchImpl ? { fetch: fetchImpl } : {}),
  });
  const base = "/api/v1/kiosk/league" as const;
  return {
    idle: () => unwrap(client.GET(`${base}/idle`)),
    standings: (ladder: Ladder, search: string) =>
      unwrap(client.GET(`${base}/standings`, { params: { query: { ladder, search } } })),
    session: (card: Card) => unwrap(client.POST(`${base}/session`, { body: { card } })),
    logout: (session: string) => unwrap(client.POST(`${base}/logout`, { body: { session } })),
    consentText: (language: string) =>
      unwrap(client.GET(`${base}/consent`, { params: { query: { language } } })),
    signConsent: (card: Card, language: string) =>
      unwrap(client.POST(`${base}/consent`, { body: { card, language, accepted: true } })),
    propose: (card: Card, bookingId: string, teamA: string[], teamB: string[], score: Score) =>
      unwrap(
        client.POST(`${base}/matches`, {
          body: { card, booking_id: bookingId, team_a: teamA, team_b: teamB, score },
        }),
      ),
    respond: (matchId: string, card: Card, accept: boolean) =>
      unwrap(
        client.POST(`${base}/matches/{match_id}/respond`, {
          params: { path: { match_id: matchId } },
          body: { card, accept },
        }),
      ),
    director: (matchId: string, card: Card) =>
      unwrap(
        client.POST(`${base}/matches/{match_id}/director`, {
          params: { path: { match_id: matchId } },
          body: { card },
        }),
      ),
    fixtureFinished: (fixtureId: string, card: Card) =>
      unwrap(
        client.POST(`${base}/fixtures/{fixture_id}/finished`, {
          params: { path: { fixture_id: fixtureId } },
          body: { card },
        }),
      ),
    fixtureScore: (fixtureId: string, card: Card, score: Score) =>
      unwrap(
        client.POST(`${base}/fixtures/{fixture_id}/score`, {
          params: { path: { fixture_id: fixtureId } },
          body: { card, score },
        }),
      ),
    issueChallenge: (cards: Card[], targets: string[]) =>
      unwrap(client.POST(`${base}/challenges`, { body: { cards, targets } })),
    answerChallenge: (challengeId: string, card: Card, accept: boolean) =>
      unwrap(
        client.POST(`${base}/challenges/{challenge_id}/answer`, {
          params: { path: { challenge_id: challengeId } },
          body: { card, accept },
        }),
      ),
    checkIn: (card: Card) => unwrap(client.POST(`${base}/check-in`, { body: { card } })),
  };
}

export type KioskApi = ReturnType<typeof kioskApi>;
