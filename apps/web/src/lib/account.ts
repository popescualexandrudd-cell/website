/**
 * The visitor's account on the website (§9.3 `/cont`, ADR-0011): the session cookie and Django's
 * CSRF token, through the shared API client (`credentials: "include"`, `X-CSRFToken` on changes).
 * Every call answers an `Outcome`: the data, or the stable error code (translated on screen as
 * `errors.<code>`) with its parameters. Nothing here decides anything: the server does.
 */
import type { components } from "@jungle/api-client";
import { api, errorParams } from "./api";

export type Me = components["schemas"]["MeOut"];
export type Booking = components["schemas"]["BookingOut"];
export type Enrollment = components["schemas"]["EnrollmentOut"];

export type Outcome<T> =
  | { ok: true; data: T }
  | { ok: false; code: string | null; params: Record<string, string | number> };

type Answer<T> = { data?: T; error?: unknown; response: Response };

/** The error code of an API answer ("auth.invalid_credentials"), or null. */
export function codeOf(body: unknown): string | null {
  const code = (body as { error?: { code?: unknown } } | undefined)?.error?.code;
  return typeof code === "string" && /^[a-z_]+\.[a-z_]+$/.test(code) ? code : null;
}

export async function outcome<T>(call: () => Promise<Answer<T>>): Promise<Outcome<T>> {
  try {
    const answer = await call();
    if (answer.response.ok) return { ok: true, data: answer.data as T };
    return { ok: false, code: codeOf(answer.error), params: errorParams(answer.error) };
  } catch {
    return { ok: false, code: null, params: {} };
  }
}

let csrfReady: Promise<unknown> | null = null;

/** Django sets the CSRF cookie once; every form waits for it before its first change. */
export function ensureCsrf(): Promise<unknown> {
  csrfReady ??= api.GET("/api/v1/auth/csrf").catch(() => {
    csrfReady = null;
  });
  return csrfReady;
}

export async function session(): Promise<Outcome<{ authenticated: boolean; user?: Me | null }>> {
  return outcome(() => api.GET("/api/v1/auth/session"));
}

export async function login(email: string, password: string, otp: string | null) {
  await ensureCsrf();
  return outcome(() => api.POST("/api/v1/auth/login", { body: { email, password, otp_code: otp } }));
}

export type Registration = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  date_of_birth: string;
  preferred_language: "ro" | "en";
  accepted_documents: { kind: "terms" | "privacy"; version: number; language: "ro" | "en" }[];
};

export async function register(data: Registration) {
  await ensureCsrf();
  return outcome(() => api.POST("/api/v1/auth/register", { body: data }));
}

export async function verifyEmail(token: string) {
  await ensureCsrf();
  return outcome(() => api.POST("/api/v1/auth/verify-email", { body: { token } }));
}

export async function resendVerification() {
  await ensureCsrf();
  return outcome(() => api.POST("/api/v1/auth/verify-email/resend"));
}

export async function requestReset(email: string) {
  await ensureCsrf();
  return outcome(() => api.POST("/api/v1/auth/password-reset", { body: { email } }));
}

export async function confirmReset(uid: string, token: string, newPassword: string) {
  await ensureCsrf();
  return outcome(() => api.POST("/api/v1/auth/password-reset/confirm", { body: { uid, token, new_password: newPassword } }));
}

export async function logout() {
  await ensureCsrf();
  return outcome(() => api.POST("/api/v1/auth/logout"));
}

export async function myBookings() {
  return outcome(() => api.GET("/api/v1/bookings/mine"));
}

export async function cancelBooking(id: string) {
  await ensureCsrf();
  // A customer never waives the fee: only staff can, with a reason (R-071).
  return outcome(() => api.POST("/api/v1/bookings/{booking_id}/cancel", { params: { path: { booking_id: id } }, body: { reason: "", waive: false } }));
}

export async function myClasses() {
  return outcome(() => api.GET("/api/v1/classes/mine"));
}

/** Upcoming first (soonest at the top), then the past ones (latest first); cancelled at the end. */
export function sortBookings(list: Booking[], now: Date): { upcoming: Booking[]; past: Booking[] } {
  const live = list.filter((b) => b.status !== "cancelled");
  const upcoming = live.filter((b) => new Date(b.ends_at) > now).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const past = [
    ...live.filter((b) => new Date(b.ends_at) <= now).sort((a, b) => b.starts_at.localeCompare(a.starts_at)),
    ...list.filter((b) => b.status === "cancelled").sort((a, b) => b.starts_at.localeCompare(a.starts_at)),
  ];
  return { upcoming, past };
}
