"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";
import {
  CONSENT_EVENT,
  captureAttribution,
  clearTrackingCookies,
  readConsent,
  setCampaignConfig,
  track,
  type CampaignConfig,
  type Consent,
} from "@/lib/analytics/client";

/** Accounts already started in this page load (the effect may run again after a refresh). */
const configured = new Set<string>();

function loadScript(src: string): void {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function googleConsent(consent: Consent) {
  const state = (granted: boolean) => (granted ? "granted" : "denied");
  return {
    analytics_storage: state(consent.analytics),
    ad_storage: state(consent.marketing),
    ad_user_data: state(consent.marketing),
    ad_personalization: state(consent.marketing),
  };
}

/** gtag.js with Consent Mode v2: Analytics with the statistics choice, Ads with marketing. */
function startGoogle(config: CampaignConfig, consent: Consent): void {
  const analytics = consent.analytics && config.gaId;
  const ads = consent.marketing && config.adsId;
  if (!analytics && !ads) return;
  if (!window.gtag) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // gtag.js reads the `arguments` object itself, as in Google's snippet.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };
    window.gtag("consent", "default", googleConsent(consent));
    window.gtag("js", new Date());
    loadScript(
      `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.gaId ?? config.adsId ?? "")}`,
    );
  } else {
    window.gtag("consent", "update", googleConsent(consent));
  }
  for (const id of [analytics ? config.gaId : null, ads ? config.adsId : null]) {
    if (!id || configured.has(id)) continue;
    configured.add(id);
    window.gtag("config", id);
  }
}

/** The Meta Pixel, with marketing consent only (Meta's snippet, without the inline script). */
function startMeta(config: CampaignConfig, consent: Consent): void {
  if (!consent.marketing || !config.metaPixelId || window.fbq) return;
  type Fbq = NonNullable<Window["fbq"]> & {
    callMethod?: (...args: unknown[]) => void;
    queue: unknown[];
    push?: unknown;
    loaded?: boolean;
    version?: string;
  };
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  loadScript("https://connect.facebook.net/en_US/fbevents.js");
  fbq("init", config.metaPixelId);
  fbq("track", "PageView");
}

/**
 * Loads Google Analytics, Google Ads and the Meta Pixel once the visitor agrees (and only the
 * ones configured on the server). Withdrawing consent removes their cookies and reloads the
 * page, so no tracking script stays in memory.
 */
export function CampaignTags({ config }: { config: CampaignConfig }) {
  const pathname = usePathname();
  const firstPath = useRef(true);

  useEffect(() => {
    setCampaignConfig(config);
    captureAttribution();
    let current = readConsent();
    if (current) {
      startGoogle(config, current);
      startMeta(config, current);
    }
    const onChange = (event: Event) => {
      const next = (event as CustomEvent<Consent>).detail;
      const withdrawn =
        (current?.analytics && !next.analytics) || (current?.marketing && !next.marketing);
      current = next;
      if (withdrawn) {
        clearTrackingCookies();
        location.reload();
        return;
      }
      startGoogle(config, next);
      startMeta(config, next);
    };
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, [config]);

  // Calls and WhatsApp messages started from any link on the site.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      const href = link?.getAttribute("href") ?? "";
      if (href.startsWith("tel:")) track("phone_click");
      else if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href)) track("whatsapp_click");
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  // Page views after client-side navigation (Google Analytics counts them on its own).
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [pathname]);

  return null;
}
