/**
 * Cookie consent (§12.2, Law 506/2004 art. 4(5), ePrivacy art. 5(3)).
 * The choice lives in the strictly necessary cookie `jp_consent` for 12 months. Nothing optional
 * (statistics) runs until the visitor accepts; rejecting is as easy as accepting.
 */
export const CONSENT_COOKIE = "jp_consent";
export const CONSENT_VERSION = 1;
export const CONSENT_MAX_AGE_S = 365 * 24 * 60 * 60;
export const OPEN_SETTINGS_EVENT = "jp:cookie-settings";

export type Consent = { v: number; stats: boolean; ts: number };

/** The stored choice, or null when missing, malformed or from an older policy version (ask again). */
export function parseConsent(cookieHeader: string): Consent | null {
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key !== CONSENT_COOKIE) continue;
    try {
      const value: unknown = JSON.parse(decodeURIComponent(rest.join("=")));
      if (typeof value !== "object" || value === null) return null;
      const { v, stats, ts } = value as Record<string, unknown>;
      if (v !== CONSENT_VERSION || typeof stats !== "boolean" || typeof ts !== "number") return null;
      return { v, stats, ts };
    } catch {
      return null;
    }
  }
  return null;
}

export function serializeConsent(stats: boolean, now: number, secure: boolean): string {
  const value = encodeURIComponent(JSON.stringify({ v: CONSENT_VERSION, stats, ts: now }));
  return `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${CONSENT_MAX_AGE_S}; SameSite=Lax${secure ? "; Secure" : ""}`;
}
