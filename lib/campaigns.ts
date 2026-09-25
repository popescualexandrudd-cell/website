import type { CampaignConfig } from "./analytics/client";

/**
 * The advertising and statistics accounts from the server configuration (.env). A value in the
 * wrong format is ignored, so a typo cannot break the page or its security policy.
 */
export function campaignConfig(env: NodeJS.ProcessEnv = process.env): CampaignConfig {
  const pick = (value: string | undefined, pattern: RegExp) => {
    const trimmed = value?.trim();
    return trimmed && pattern.test(trimmed) ? trimmed : null;
  };
  const adsId = pick(env.GOOGLE_ADS_ID, /^AW-\d{6,14}$/);
  return {
    gaId: pick(env.GA_MEASUREMENT_ID, /^G-[A-Z0-9]{4,16}$/),
    adsId,
    adsBookingLabel: adsId ? pick(env.GOOGLE_ADS_BOOKING_LABEL, /^[\w-]{4,40}$/) : null,
    adsLeadLabel: adsId ? pick(env.GOOGLE_ADS_LEAD_LABEL, /^[\w-]{4,40}$/) : null,
    metaPixelId: pick(env.META_PIXEL_ID, /^\d{8,20}$/),
  };
}

/** Whether the site asks for cookie consent at all: only when some tracking is configured. */
export function needsConsent(config: CampaignConfig): boolean {
  return Boolean(config.gaId || config.adsId || config.metaPixelId);
}

/** The hosts Google Analytics, Google Ads and the Meta Pixel load from and send data to. */
export function campaignCspSources(config: CampaignConfig) {
  const script: string[] = [];
  const connect: string[] = [];
  const img: string[] = [];
  const frame: string[] = [];
  if (config.gaId || config.adsId) {
    script.push("https://www.googletagmanager.com");
    connect.push(
      "https://*.google-analytics.com",
      "https://*.analytics.google.com",
      "https://*.googletagmanager.com",
    );
    img.push("https://*.google-analytics.com", "https://*.googletagmanager.com");
  }
  if (config.adsId) {
    script.push("https://www.googleadservices.com", "https://googleads.g.doubleclick.net");
    connect.push(
      "https://*.g.doubleclick.net",
      "https://www.googleadservices.com",
      "https://www.google.com",
      "https://www.google.ro",
    );
    img.push(
      "https://googleads.g.doubleclick.net",
      "https://www.google.com",
      "https://www.google.ro",
    );
    frame.push("https://td.doubleclick.net", "https://www.googletagmanager.com");
  }
  if (config.metaPixelId) {
    script.push("https://connect.facebook.net");
    connect.push("https://connect.facebook.net", "https://www.facebook.com");
    img.push("https://www.facebook.com");
  }
  return { script, connect, img, frame };
}
