"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  CONSENT_COOKIE,
  CONSENT_EVENT,
  CONSENT_OPEN_EVENT,
  readConsent,
  saveConsent,
  type Consent,
} from "@/lib/analytics/client";

function subscribeConsent(onChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onChange);
  return () => window.removeEventListener(CONSENT_EVENT, onChange);
}

/** The raw consent cookie ("a1.m0"), or "" when the visitor has not chosen yet. */
function storedConsent(): string {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CONSENT_COOKIE}=([^;]*)`));
  return match?.[1] ?? "";
}

type Props = {
  /** Google Analytics is configured. */
  analytics: boolean;
  /** Names of the configured advertising tools, e.g. ["Google Ads", "Meta"]. */
  marketing: string[];
};

/**
 * Asks for consent before any statistics or advertising cookie, with "Accept" and "Refuse" of
 * equal weight and a choice per category. Shown only when such tools are configured; the
 * footer's "Cookie settings" opens it again.
 */
export function CookieBanner({ analytics, marketing }: Props) {
  const t = useTranslations("consent");
  const id = useId();
  // The choice lives in a cookie the server render does not read: nothing shows until hydration.
  const stored = useSyncExternalStore(subscribeConsent, storedConsent, () => null);
  const [reopened, setReopened] = useState(false);
  const [custom, setCustom] = useState(false);
  const [choice, setChoice] = useState<Consent>({ analytics: false, marketing: false });

  useEffect(() => {
    const reopen = () => {
      setChoice(readConsent() ?? { analytics: false, marketing: false });
      setCustom(true);
      setReopened(true);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, []);

  const visible = stored !== null && (stored === "" || reopened);
  if (!visible) return null;

  const decide = (consent: Consent) => {
    saveConsent({
      analytics: analytics && consent.analytics,
      marketing: marketing.length > 0 && consent.marketing,
    });
    setReopened(false);
  };

  return (
    <section className="cookie-banner" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="cookie-title">
        {t("title")}
      </h2>
      <p className="cookie-text">
        {t("intro", {
          kind: analytics && marketing.length > 0 ? "both" : analytics ? "analytics" : "ads",
        })}{" "}
        <Link href="/cookies" className="cookie-link">
          {t("policy")}
        </Link>
      </p>
      {custom ? (
        <fieldset className="cookie-options">
          <legend className="sr-only">{t("choose")}</legend>
          <label className="cookie-option">
            <input type="checkbox" checked disabled />
            <span>
              <strong>{t("necessary")}</strong>
              <span className="cookie-option-text">{t("necessaryText")}</span>
            </span>
          </label>
          {analytics ? (
            <label className="cookie-option">
              <input
                type="checkbox"
                checked={choice.analytics}
                onChange={(event) => setChoice({ ...choice, analytics: event.target.checked })}
              />
              <span>
                <strong>{t("analytics")}</strong>
                <span className="cookie-option-text">{t("analyticsText")}</span>
              </span>
            </label>
          ) : null}
          {marketing.length > 0 ? (
            <label className="cookie-option">
              <input
                type="checkbox"
                checked={choice.marketing}
                onChange={(event) => setChoice({ ...choice, marketing: event.target.checked })}
              />
              <span>
                <strong>{t("marketing")}</strong>
                <span className="cookie-option-text">
                  {t("marketingText", { tools: marketing.join(t("and")) })}
                </span>
              </span>
            </label>
          ) : null}
        </fieldset>
      ) : null}
      <div className="cookie-actions">
        <button
          type="button"
          className="cookie-button"
          onClick={() => decide({ analytics: true, marketing: true })}
        >
          {t("acceptAll")}
        </button>
        <button
          type="button"
          className="cookie-button"
          onClick={() => decide({ analytics: false, marketing: false })}
        >
          {t("refuse")}
        </button>
        {custom ? (
          <button
            type="button"
            className="cookie-button cookie-button--quiet"
            onClick={() => decide(choice)}
          >
            {t("save")}
          </button>
        ) : (
          <button
            type="button"
            className="cookie-button cookie-button--quiet"
            onClick={() => setCustom(true)}
          >
            {t("customize")}
          </button>
        )}
      </div>
    </section>
  );
}

/** "Cookie settings" in the footer: opens the banner again to change the choice. */
export function CookieSettingsButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="footer-link-button"
      onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}
    >
      {label}
    </button>
  );
}
