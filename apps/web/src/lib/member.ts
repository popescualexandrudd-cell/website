/**
 * The rest of the visitor's account (§9.3 `/cont`): the member card and Wallet (R-020 … R-022),
 * money (credit, debts, history, R-065), subscriptions (R-080 …), vouchers and the referral code,
 * the profile, children (R-002), the league seen from the inside (§6.15, private) and privacy
 * (GDPR export and deletion, §12.2). Same rules as `account.ts`: every answer is the server's.
 */
import type { components } from "@jungle/api-client";
import { ensureCsrf, outcome } from "./account";
import { api } from "./api";
import { API_URL, LOCATION_SLUG } from "./site";

export type Card = components["schemas"]["CardOut"];
export type Balance = components["schemas"]["AccountOut"];
export type Entry = components["schemas"]["EntryOut"];
export type Subscription = components["schemas"]["SubscriptionOut"];
export type Voucher = components["schemas"]["VoucherOut"];
export type Child = components["schemas"]["ChildOut"];
export type LeagueMe = components["schemas"]["LeagueMeOut"];
export type Consent = components["schemas"]["ConsentStatusOut"];
export type Profile = { first_name: string; last_name: string; phone: string; preferred_language: "ro" | "en" };

// ------------------------------------------------------------------ the card (R-020 … R-022)
export const myCard = () => outcome(() => api.GET("/api/v1/cards/mine"));

export async function replaceCard() {
  await ensureCsrf();
  return outcome(() => api.POST("/api/v1/cards/mine/replace"));
}

export const googleWallet = () => outcome(() => api.GET("/api/v1/cards/mine/google"));

/** Addresses opened by the browser itself (a download), with the session cookie. */
export const APPLE_WALLET_URL = `${API_URL}/api/v1/cards/mine/apple.pkpass`;
export const EXPORT_URL = `${API_URL}/api/v1/privacy/export`;

/** The card's QR code as an image: the server's SVG is never inserted into the page as markup. */
export function qrImage(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ------------------------------------------------------------------ money (R-065)
export const balance = () => outcome(() => api.GET("/api/v1/account"));
export const entries = () => outcome(() => api.GET("/api/v1/account/entries"));
export const vouchers = () => outcome(() => api.GET("/api/v1/account/vouchers"));
export const referralCode = () => outcome(() => api.GET("/api/v1/account/referral-code"));

/** R-120: a new member enters the code of the friend who brought them (before a first subscription). */
export async function claimReferral(code: string) {
  await ensureCsrf();
  return outcome(() => api.POST("/api/v1/account/referral", { body: { code } }));
}

/**
 * What a ledger line means for the visitor. The ledger writes + for a debit and − for a credit
 * (ADR-0009): money held for the visitor grows with a credit, what the visitor owes with a debit.
 */
export function entryChange(entry: Pick<Entry, "account" | "amount">): { side: "credit" | "debt"; delta: number } {
  return entry.account === "receivable" ? { side: "debt", delta: entry.amount } : { side: "credit", delta: -entry.amount };
}

/** Vouchers still usable first (the soonest to expire at the top), then the used or expired ones. */
export function sortVouchers(list: Voucher[], today: string): { usable: Voucher[]; other: Voucher[] } {
  const usable = list.filter((v) => v.status === "active" && v.valid_until >= today && v.valid_from <= today);
  const other = list.filter((v) => !usable.includes(v));
  return {
    usable: usable.sort((a, b) => a.valid_until.localeCompare(b.valid_until)),
    other: other.sort((a, b) => b.valid_until.localeCompare(a.valid_until)),
  };
}

// ------------------------------------------------------------------ subscriptions
export const subscriptions = () => outcome(() => api.GET("/api/v1/subscriptions/mine"));

export async function cancelSubscription(id: string) {
  await ensureCsrf();
  return outcome(() => api.POST("/api/v1/subscriptions/{subscription_id}/cancel", { params: { path: { subscription_id: id } } }));
}

export async function freezeSubscription(id: string, startsOn: string, days: number) {
  await ensureCsrf();
  return outcome(() =>
    api.POST("/api/v1/subscriptions/{subscription_id}/freeze", {
      params: { path: { subscription_id: id } },
      body: { starts_on: startsOn, days },
    }),
  );
}

/** Active first, then waiting for payment, then the ended or cancelled ones; newest first in each. */
export function sortSubscriptions(list: Subscription[], today: string): Subscription[] {
  const rank = (s: Subscription) => (s.status === "active" && s.ends_on >= today ? 0 : s.status === "pending_payment" ? 1 : 2);
  return [...list].sort((a, b) => rank(a) - rank(b) || b.starts_on.localeCompare(a.starts_on));
}

// ------------------------------------------------------------------ the profile and children
export async function updateProfile(profile: Profile) {
  await ensureCsrf();
  return outcome(() => api.PATCH("/api/v1/me", { body: profile }));
}

export async function changePassword(current: string, next: string) {
  await ensureCsrf();
  return outcome(() => api.POST("/api/v1/me/password", { body: { current_password: current, new_password: next } }));
}

export const children = () => outcome(() => api.GET("/api/v1/me/children"));

export async function addChild(firstName: string, lastName: string, dateOfBirth: string) {
  await ensureCsrf();
  return outcome(() =>
    api.POST("/api/v1/me/children", { body: { first_name: firstName, last_name: lastName, date_of_birth: dateOfBirth } }),
  );
}

// ------------------------------------------------------------------ the league, from the inside (§6.15)
export const leagueMe = () => outcome(() => api.GET("/api/v1/league/me"));

export const consent = (language: string) =>
  outcome(() => api.GET("/api/v1/privacy/league-consent", { params: { query: { language } } }));

export async function withdrawConsent() {
  await ensureCsrf();
  return outcome(() => api.POST("/api/v1/privacy/league-consent/withdraw"));
}

// ------------------------------------------------------------------ privacy (§12.2)
export async function deleteAccount(password: string, forfeitCredit: boolean) {
  await ensureCsrf();
  return outcome(() => api.POST("/api/v1/privacy/delete-account", { body: { password, forfeit_credit: forfeitCredit } }));
}

/** Today in the club's time zone (YYYY-MM-DD), for comparing with the server's dates. */
export function clubToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(
    now,
  );
}

// ------------------------------------------------------------------ the event room (R-110, Q34)
export type EventRequest = components["schemas"]["EventOut"];

export const myEvents = () => outcome(() => api.GET("/api/v1/events/mine"));

/** The club's event room, from the day's availability (its id and the times already taken). */
export async function eventRoom(day: string) {
  const answer = await outcome(() => api.GET("/api/v1/bookings/availability", { params: { query: { location: LOCATION_SLUG, day } } }));
  if (!answer.ok) return answer;
  return { ok: true as const, data: answer.data.resources.find((r) => r.kind === "event_room") ?? null };
}

export async function requestEvent(request: { room_id: string; starts_at: string; duration_minutes: number; guests: number; message: string }) {
  await ensureCsrf();
  return outcome(() => api.POST("/api/v1/events", { body: request }));
}

/** The next requests first (soonest at the top), then the past ones. */
export function sortEvents(list: EventRequest[], now: Date): EventRequest[] {
  const upcoming = list.filter((e) => new Date(e.ends_at) > now).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const past = list.filter((e) => new Date(e.ends_at) <= now).sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  return [...upcoming, ...past];
}

// ------------------------------------------------------------------ tournaments and challenges (§6.12, §6.14)
export type Tournament = components["schemas"]["TournamentOut"];
export type TournamentEntry = components["schemas"]["TournamentEntryOut"];
export type Challenge = components["schemas"]["ChallengeOut"];

export const tournaments = () => outcome(() => api.GET("/api/v1/league/tournaments", { params: { query: { location: LOCATION_SLUG } } }));

/** The visitor's entry in a tournament (from the public list of entries), or null. */
export async function myEntry(tournamentId: string, playerId: string): Promise<TournamentEntry | null> {
  const answer = await outcome(() => api.GET("/api/v1/league/tournaments/{tournament_id}", { params: { path: { tournament_id: tournamentId } } }));
  if (!answer.ok) return null;
  return answer.data.entries_list.find((entry) => entry.players.some((p) => p.id === playerId)) ?? null;
}

export async function enterTournament(tournamentId: string, partnerId: string | null) {
  await ensureCsrf();
  return outcome(() =>
    api.POST("/api/v1/league/tournaments/{tournament_id}/entries", {
      params: { path: { tournament_id: tournamentId } },
      body: { partner_id: partnerId },
    }),
  );
}

export async function withdrawEntry(entryId: string) {
  await ensureCsrf();
  return outcome(() => api.POST("/api/v1/league/tournament-entries/{entry_id}/withdraw", { params: { path: { entry_id: entryId } } }));
}

export const challenges = () => outcome(() => api.GET("/api/v1/league/me/challenges"));

/** The partner, from the address of their public page in the standings (or the bare id). */
export function partnerIdFrom(text: string): string | null {
  const found = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return found ? found[0].toLowerCase() : null;
}

// ------------------------------------------------------------------ notifications (§11, Stage 12)
export type Choices = Record<string, Record<string, boolean>>;

export const notificationChoices = () => outcome(() => api.GET("/api/v1/notifications/preferences"));

export async function saveNotificationChoices(choices: Choices) {
  await ensureCsrf();
  return outcome(() => api.PUT("/api/v1/notifications/preferences", { body: { choices } }));
}

export const pushKey = () => outcome(() => api.GET("/api/v1/notifications/push-key"));

/** The VAPID key as the bytes `pushManager.subscribe` wants. */
export function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export async function savePushSubscription(subscription: { endpoint: string; p256dh: string; auth: string }) {
  await ensureCsrf();
  return outcome(() => api.POST("/api/v1/notifications/push-subscriptions", { body: subscription }));
}

export async function removePushSubscription(endpoint: string) {
  await ensureCsrf();
  return outcome(() => api.POST("/api/v1/notifications/push-subscriptions/remove", { body: { endpoint } }));
}

// ------------------------------------------------------------------ the question after the first game (Q71)
export const feedbackState = () => outcome(() => api.GET("/api/v1/feedback"));

export async function answerFeedback(score: number) {
  await ensureCsrf();
  return outcome(() => api.POST("/api/v1/feedback", { body: { score } }));
}

/** The eleven answers, 0 … 10, in the order they are shown. */
export const FEEDBACK_SCORES: readonly number[] = Array.from({ length: 11 }, (_, n) => n);
