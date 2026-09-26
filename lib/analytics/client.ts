import { attributionFromVisit, type Attribution } from "@/lib/attribution-visit";

/**
 * Consent, campaign attribution and conversion events, in the browser.
 *
 * Nothing that stores data on the visitor's device runs before they agree: Google Analytics and
 * Google Ads need the "statistics" or "marketing" choice, the Meta Pixel needs "marketing". Umami
 * (if configured) uses no cookies and counts events either way. The choice itself is kept in a
 * first-party cookie for six months.
 */

export type Consent = { analytics: boolean; marketing: boolean };

export type CampaignConfig = {
  gaId: string | null;
  adsId: string | null;
  adsBookingLabel: string | null;
  adsLeadLabel: string | null;
  metaPixelId: string | null;
};

export type ConversionEvent =
  | "booking_request"
  | "evaluation_request"
  | "waitlist_request"
  | "contact_message"
  | "court_request"
  | "gift_request"
  | "player_signup"
  | "partner_request"
  | "phone_click"
  | "whatsapp_click"
  | "assistant_open"
  | "assistant_question"
  | "assistant_cta";

type Params = Record<string, string | number>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[] };
    umami?: { track: (event: string, data?: Params) => void };
  }
}

export const CONSENT_COOKIE = "cookie_consent";
const CONSENT_MAX_AGE = 60 * 60 * 24 * 180;
export const CONSENT_EVENT = "consent-change";
export const CONSENT_OPEN_EVENT = "consent-open";
const ATTRIBUTION_KEY = "attribution";

// ─── Consent ─────────────────────────────────────────────────────────────────

/** "a1.m0" → { analytics: true, marketing: false }; null when the visitor has not chosen. */
export function parseConsent(cookieHeader: string): Consent | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${CONSENT_COOKIE}=a([01])\\.m([01])`));
  if (!match) return null;
  return { analytics: match[1] === "1", marketing: match[2] === "1" };
}

export function readConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  return parseConsent(document.cookie);
}

export function saveConsent(consent: Consent): void {
  const value = `a${consent.analytics ? 1 : 0}.m${consent.marketing ? 1 : 0}`;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${CONSENT_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
  if (consent.analytics) persistAttribution();
  else safeSession((s) => s.removeItem(ATTRIBUTION_KEY));
  window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: consent }));
}

/** Removes the cookies Google and Meta set, after the visitor withdraws consent. */
export function clearTrackingCookies(): void {
  const host = location.hostname;
  const domains = ["", host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
  for (const entry of document.cookie.split(";")) {
    const name = entry.split("=")[0]?.trim();
    if (!name || !/^(_ga|_gid|_gat|_gcl|_fbp|_fbc)/.test(name)) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/${domain ? `; Domain=${domain}` : ""}`;
    }
  }
}

// ─── Attribution ─────────────────────────────────────────────────────────────

let attribution: Attribution | null | undefined;

function safeSession(run: (storage: Storage) => void): void {
  try {
    run(window.sessionStorage);
  } catch {
    // Storage blocked (private mode, settings): the in-memory value is enough.
  }
}

function persistAttribution(): void {
  if (!attribution) return;
  const value = JSON.stringify(attribution);
  safeSession((s) => s.setItem(ATTRIBUTION_KEY, value));
}

/**
 * Called once when the site loads. The source stays in memory while the visitor moves between
 * pages; with the statistics consent it also survives a reload (sessionStorage).
 */
export function captureAttribution(): void {
  if (attribution !== undefined || typeof window === "undefined") return;
  attribution = attributionFromVisit(new URL(location.href), document.referrer, location.hostname);
  if (!attribution) {
    safeSession((s) => {
      const stored = s.getItem(ATTRIBUTION_KEY);
      if (stored) attribution = JSON.parse(stored) as Attribution;
    });
  } else if (readConsent()?.analytics) {
    persistAttribution();
  }
}

/** The value for the hidden "attribution" field of the public forms. */
export function currentAttribution(): string {
  captureAttribution();
  return attribution ? JSON.stringify(attribution) : "";
}

// ─── Events ──────────────────────────────────────────────────────────────────

let config: CampaignConfig | null = null;

export function setCampaignConfig(value: CampaignConfig): void {
  config = value;
}

const GA_EVENT: Record<ConversionEvent, [string, Params?]> = {
  booking_request: ["booking_request"],
  evaluation_request: ["generate_lead", { form: "evaluation" }],
  waitlist_request: ["generate_lead", { form: "waitlist" }],
  contact_message: ["generate_lead", { form: "contact" }],
  court_request: ["generate_lead", { form: "court" }],
  gift_request: ["generate_lead", { form: "gift" }],
  player_signup: ["generate_lead", { form: "league" }],
  partner_request: ["generate_lead", { form: "partner" }],
  phone_click: ["contact_click", { method: "phone" }],
  whatsapp_click: ["contact_click", { method: "whatsapp" }],
  assistant_open: ["assistant_open"],
  assistant_question: ["assistant_question"],
  assistant_cta: ["assistant_cta"],
};

const META_EVENT: Partial<Record<ConversionEvent, string>> = {
  booking_request: "Schedule",
  evaluation_request: "Lead",
  waitlist_request: "Lead",
  contact_message: "Contact",
  court_request: "Lead",
  gift_request: "Lead",
  player_signup: "Lead",
  partner_request: "Lead",
  phone_click: "Contact",
  whatsapp_click: "Contact",
};

/**
 * Records a conversion or an interaction: in Umami always (no cookies), in Google Analytics and
 * Google Ads with the statistics or marketing consent, in the Meta Pixel with marketing consent.
 */
export function track(event: ConversionEvent, params: Params = {}): void {
  if (typeof window === "undefined") return;
  window.umami?.track(event, params);
  const consent = readConsent();
  if (!consent || !config) return;
  const [gaName, gaParams] = GA_EVENT[event];
  if (window.gtag && consent.analytics && config.gaId) {
    window.gtag("event", gaName, { ...gaParams, ...params });
  }
  if (window.gtag && consent.marketing && config.adsId) {
    const label =
      event === "booking_request"
        ? config.adsBookingLabel
        : event === "evaluation_request" ||
            event === "waitlist_request" ||
            event === "contact_message" ||
            event === "court_request" ||
            event === "gift_request" ||
            event === "player_signup" ||
            event === "partner_request"
          ? config.adsLeadLabel
          : null;
    if (label) window.gtag("event", "conversion", { send_to: `${config.adsId}/${label}` });
  }
  const metaName = META_EVENT[event];
  if (window.fbq && consent.marketing && config.metaPixelId && metaName) {
    window.fbq("track", metaName);
  }
}
