import { z } from "zod";

/**
 * Where a visitor came from: a campaign (UTM tags or an ad click), a search engine, a social
 * network or another site. Stored with bookings, assessment requests and messages, so the admin
 * shows how many of them each campaign brought. No click identifiers or personal data: only the
 * fact that the click came from Google Ads or a Meta ad.
 */
export type Attribution = {
  source: string;
  medium: string;
  campaign?: string;
  term?: string;
  content?: string;
  /** The visit started from an ad click (gclid, fbclid, msclkid). */
  adClick?: "google" | "meta" | "microsoft";
  /** First page of the visit, without the query string. */
  landing?: string;
};

const text = (max: number) =>
  z
    .string()
    .transform((value) => value.trim().slice(0, max))
    .optional();

export const attributionSchema = z.object({
  source: z.string().trim().min(1).max(100),
  medium: z.string().trim().min(1).max(100),
  campaign: text(150),
  term: text(150),
  content: text(150),
  adClick: z.enum(["google", "meta", "microsoft"]).optional(),
  landing: text(300),
});

/** Reads the hidden form field; anything malformed is simply not recorded. */
export function parseAttributionField(value: unknown): Attribution | null {
  if (typeof value !== "string" || !value || value.length > 2000) return null;
  try {
    const parsed = attributionSchema.safeParse(JSON.parse(value));
    if (!parsed.success) return null;
    const clean = Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== undefined && v !== ""),
    );
    return clean as Attribution;
  } catch {
    return null;
  }
}

const SEARCH = /(^|\.)(google|bing|yahoo|duckduckgo|ecosia|yandex|baidu)\./;
const SOCIAL: [RegExp, string][] = [
  [/(^|\.)(facebook\.com|fb\.me|m\.facebook\.com|l\.facebook\.com)$/, "facebook"],
  [/(^|\.)(instagram\.com|l\.instagram\.com)$/, "instagram"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, "linkedin"],
  [/(^|\.)(t\.co|x\.com|twitter\.com)$/, "x"],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, "whatsapp"],
];

/**
 * The source of a visit from its first URL and the referring page. UTM tags win; an ad click
 * without tags counts as that network's paid traffic; otherwise the referrer tells search,
 * social or referral. A direct visit (no tags, no referrer, or our own site) returns null.
 */
export function attributionFromVisit(
  url: URL,
  referrer: string,
  ownHost: string,
): Attribution | null {
  const q = url.searchParams;
  const utm = (key: string) => q.get(`utm_${key}`)?.trim().toLowerCase().slice(0, 150) || undefined;
  const adClick: Attribution["adClick"] =
    q.has("gclid") || q.has("gbraid") || q.has("wbraid")
      ? "google"
      : q.has("fbclid")
        ? "meta"
        : q.has("msclkid")
          ? "microsoft"
          : undefined;
  const landing = url.pathname.slice(0, 300);
  let referrerHost = "";
  try {
    referrerHost = referrer ? new URL(referrer).hostname.replace(/^www\./, "") : "";
  } catch {
    referrerHost = "";
  }
  if (referrerHost === ownHost.replace(/^www\./, "")) referrerHost = "";

  const source = utm("source");
  if (source) {
    return {
      source,
      medium: utm("medium") ?? (adClick ? "cpc" : "(nesetat)"),
      campaign: utm("campaign"),
      term: utm("term"),
      content: utm("content"),
      adClick,
      landing,
    };
  }
  if (adClick === "google") return { source: "google", medium: "cpc", adClick, landing };
  if (adClick === "microsoft") return { source: "bing", medium: "cpc", adClick, landing };
  // Facebook adds fbclid to every outbound link, paid or not: without UTM tags it is social.
  const social = SOCIAL.find(([pattern]) => pattern.test(referrerHost))?.[1];
  if (adClick === "meta")
    return { source: social ?? "facebook", medium: "social", adClick, landing };
  if (!referrerHost) return null;
  const search = referrerHost.match(SEARCH)?.[2];
  if (search) return { source: search, medium: "organic", landing };
  if (social) return { source: social, medium: "social", landing };
  return { source: referrerHost.slice(0, 100), medium: "referral", landing };
}

/** "google / cpc · primavara-copii" for tables in the admin. */
export function attributionLabel(value: unknown): string | null {
  const parsed = attributionSchema.safeParse(value);
  if (!parsed.success) return null;
  const a = parsed.data;
  return `${a.source} / ${a.medium}${a.campaign ? ` · ${a.campaign}` : ""}`;
}
