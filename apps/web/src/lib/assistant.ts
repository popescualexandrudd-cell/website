/**
 * The club's assistant (Stage 12D, ADR-0019): the conversation is kept only in the page and sent
 * whole with each question (the server keeps no text). The answer comes from the backend's AI,
 * which reads the club's data through its tools; a booking it prepares is confirmed by the person
 * with a button (the ordinary POST /api/v1/bookings) and paid at the Payments Kiosk.
 */
import type { components } from "@jungle/api-client";
import { api } from "./api";
import { ensureCsrf, outcome, type Outcome } from "./account";
import { LOCATION_SLUG } from "./site";

export type Turn = { role: "user" | "assistant"; content: string };
export type Answer = components["schemas"]["AskOut"];
export type Proposal = components["schemas"]["ProposalOut"];

/** As the API accepts it: the last 20 turns, each at most 2000 characters. */
export const MAX_TURNS = 20;
export const MAX_CHARS = 2000;

export function lastTurns(turns: Turn[]): Turn[] {
  return turns
    .filter((t) => t.content.trim())
    .slice(-MAX_TURNS)
    .map((t) => ({ role: t.role, content: t.content.trim().slice(0, MAX_CHARS) }));
}

export async function askClub(turns: Turn[]): Promise<Outcome<Answer>> {
  await ensureCsrf();
  return outcome(() => api.POST("/api/v1/ai/ask", { body: { location: LOCATION_SLUG, messages: lastTurns(turns) } }));
}

export async function confirmProposal(p: Proposal): Promise<Outcome<components["schemas"]["BookingOut"]>> {
  await ensureCsrf();
  return outcome(() =>
    api.POST("/api/v1/bookings", {
      body: { resource_id: p.resource_id, starts_at: p.starts_at, duration_minutes: p.duration_minutes, session_type: p.session_type },
    }),
  );
}
