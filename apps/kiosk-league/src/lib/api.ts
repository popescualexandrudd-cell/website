/**
 * The League Kiosk API (`/api/v1/kiosk/league`), typed from the backend's OpenAPI schema.
 * Every call carries the device token (ADR-0012); errors are read by `@jungle/kiosk-kit`.
 */
import type { components, paths } from "@jungle/api-client";
import { apiOrigin, deviceHeaders, unwrap } from "@jungle/kiosk-kit";
import createClient from "openapi-fetch";

export { ApiError, Offline, unwrap } from "@jungle/kiosk-kit";

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

/** `apiUrl` is the API root (…/api/v1). */
export function kioskApi(apiUrl: string, deviceToken: string, fetchImpl?: typeof fetch) {
  const client = createClient<paths>({
    baseUrl: apiOrigin(apiUrl),
    headers: deviceHeaders(deviceToken),
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
