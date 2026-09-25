import { describe, expect, it } from "vitest";
import { attributionFromVisit, attributionLabel, parseAttributionField } from "@/lib/attribution";
import { campaignCspSources, campaignConfig, needsConsent } from "@/lib/campaigns";
import { campaignUrl, summarizeSources } from "@/lib/admin/campaigns";
import { parseConsent } from "@/lib/analytics/client";
import { fillLegalTemplate } from "@/lib/legal";

const SITE = "elitetenisclub.ro";
const visit = (url: string, referrer = "") => attributionFromVisit(new URL(url), referrer, SITE);

describe("where a visit came from", () => {
  it("reads UTM tags first", () => {
    expect(
      visit(
        "https://elitetenisclub.ro/programe?utm_source=Facebook&utm_medium=paid_social&utm_campaign=Inscrieri-Toamna&fbclid=abc",
      ),
    ).toEqual({
      source: "facebook",
      medium: "paid_social",
      campaign: "inscrieri-toamna",
      term: undefined,
      content: undefined,
      adClick: "meta",
      landing: "/programe",
    });
  });

  it("recognises ad clicks, search, social and other sites", () => {
    expect(visit("https://elitetenisclub.ro/?gclid=xyz")).toMatchObject({
      source: "google",
      medium: "cpc",
      adClick: "google",
    });
    expect(visit("https://elitetenisclub.ro/", "https://www.google.ro/")).toMatchObject({
      source: "google",
      medium: "organic",
    });
    expect(visit("https://elitetenisclub.ro/", "https://l.instagram.com/")).toMatchObject({
      source: "instagram",
      medium: "social",
    });
    expect(visit("https://elitetenisclub.ro/?fbclid=1", "https://m.facebook.com/")).toMatchObject({
      source: "facebook",
      medium: "social",
      adClick: "meta",
    });
    expect(visit("https://elitetenisclub.ro/", "https://www.sportlocal.ro/articol")).toMatchObject({
      source: "sportlocal.ro",
      medium: "referral",
    });
  });

  it("counts a visit with no source, or from the site itself, as direct", () => {
    expect(visit("https://elitetenisclub.ro/")).toBeNull();
    expect(visit("https://elitetenisclub.ro/preturi", "https://www.elitetenisclub.ro/")).toBeNull();
  });

  it("stores only a well-formed value from the hidden field", () => {
    expect(parseAttributionField('{"source":"google","medium":"cpc","campaign":""}')).toEqual({
      source: "google",
      medium: "cpc",
    });
    expect(parseAttributionField("not json")).toBeNull();
    expect(parseAttributionField('{"source":"","medium":"cpc"}')).toBeNull();
    expect(parseAttributionField('{"source":"x","medium":"y","adClick":"tiktok"}')).toBeNull();
    expect(parseAttributionField("")).toBeNull();
    expect(attributionLabel({ source: "google", medium: "cpc", campaign: "vara" })).toBe(
      "google / cpc · vara",
    );
    expect(attributionLabel(null)).toBeNull();
  });
});

describe("campaign report", () => {
  it("groups requests by source and campaign, most first", () => {
    const rows = summarizeSources([
      {
        kind: "booking",
        attribution: { source: "facebook", medium: "paid_social", campaign: "t" },
      },
      {
        kind: "evaluation",
        attribution: { source: "facebook", medium: "paid_social", campaign: "t" },
      },
      { kind: "message", attribution: null },
    ]);
    expect(rows[0]).toMatchObject({
      source: "facebook",
      campaign: "t",
      total: 2,
      counts: { booking: 1, evaluation: 1, waitlist: 0, message: 0 },
    });
    expect(rows[1]).toMatchObject({ source: "direct sau necunoscut", total: 1 });
  });

  it("builds campaign links with clean UTM tags", () => {
    expect(
      campaignUrl("https://elitetenisclub.ro/programe#inscriere", {
        source: "facebook",
        medium: "paid_social",
        campaign: "Înscrieri toamnă 2026",
      }),
    ).toBe(
      "https://elitetenisclub.ro/programe?utm_source=facebook&utm_medium=paid_social&utm_campaign=inscrieri-toamna-2026#inscriere",
    );
    expect(campaignUrl("https://x.ro/", { source: "a", medium: "b", campaign: "  " })).toBeNull();
  });
});

describe("tracking configuration", () => {
  it("accepts only well-formed account IDs", () => {
    const config = campaignConfig({
      GA_MEASUREMENT_ID: "G-ABC123XYZ",
      GOOGLE_ADS_ID: "AW-123456789",
      GOOGLE_ADS_BOOKING_LABEL: "AbC-dEf_123",
      GOOGLE_ADS_LEAD_LABEL: "bad label!",
      META_PIXEL_ID: '12345"><script>',
    } as unknown as NodeJS.ProcessEnv);
    expect(config).toEqual({
      gaId: "G-ABC123XYZ",
      adsId: "AW-123456789",
      adsBookingLabel: "AbC-dEf_123",
      adsLeadLabel: null,
      metaPixelId: null,
    });
    expect(needsConsent(config)).toBe(true);
    expect(needsConsent(campaignConfig({} as unknown as NodeJS.ProcessEnv))).toBe(false);
  });

  it("opens the security policy only to the configured tools", () => {
    const none = campaignCspSources(campaignConfig({} as unknown as NodeJS.ProcessEnv));
    expect([...none.script, ...none.connect, ...none.img, ...none.frame]).toEqual([]);
    const meta = campaignCspSources(
      campaignConfig({ META_PIXEL_ID: "123456789012345" } as unknown as NodeJS.ProcessEnv),
    );
    expect(meta.script).toEqual(["https://connect.facebook.net"]);
    expect(meta.connect).not.toContain("https://*.google-analytics.com");
  });

  it("reads the visitor's cookie choice", () => {
    expect(parseConsent("a=1; cookie_consent=a1.m0; b=2")).toEqual({
      analytics: true,
      marketing: false,
    });
    expect(parseConsent("cookie_consent=a0.m1")).toEqual({ analytics: false, marketing: true });
    expect(parseConsent("other=1")).toBeNull();
  });
});

describe("legal texts follow the tools in use", () => {
  const settings = {
    legalName: "Club",
    legalForm: "ACS",
    legalCui: "1",
    legalAddress: "X",
    email: "a@b.ro",
    phone: "1",
    freeCancelHours: 24,
    paymentMethods: [],
    bookingMode: "CERERE",
  } as unknown as Parameters<typeof fillLegalTemplate>[1];
  const body = "{{sectiune.asistent}}\n\n{{transfer}}\n\n{{cookies.consimtamant}}";

  it("says no data leaves the EEA and shows no banner when nothing is on", () => {
    const text = fillLegalTemplate(body, settings, "v", "ro", 24);
    expect(text).not.toContain("Anthropic");
    expect(text).toContain("Nu transferăm date în afara Spațiului Economic European.");
    expect(text).toContain("De aceea site-ul nu afișează un banner de cookie-uri.");
  });

  it("describes the assistant and the consent when they are on", () => {
    const text = fillLegalTemplate(body, settings, "v", "ro", 24, {
      assistant: true,
      analytics: true,
      googleAds: false,
      metaPixel: true,
    });
    expect(text).toContain("Anthropic PBC (SUA)");
    expect(text).toContain("Anthropic, Google și Meta pot prelucra date și în SUA");
    expect(text).toContain("doar după ce le accepți");
    expect(text).not.toMatch(/\n{3,}/);
  });
});

describe("site paths in each language", () => {
  it("follows the translated routes", async () => {
    const { sitePath } = await import("@/lib/paths");
    expect(sitePath("/programe", "ro")).toBe("/programe");
    expect(sitePath("/programe", "en")).toBe("/en/programs");
    expect(sitePath("/", "en")).toBe("/en");
    expect(sitePath("/echipa/[slug]", "en", { slug: "ana-pop" })).toBe("/en/team/ana-pop");
    expect(sitePath("/contact", "en")).toBe("/en/contact");
  });
});
