"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CONSENT_COOKIE, OPEN_SETTINGS_EVENT, parseConsent, serializeConsent } from "@/lib/consent";

const UMAMI_SRC = process.env.NEXT_PUBLIC_UMAMI_SRC ?? "";
const UMAMI_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID ?? "";

const listeners = new Set<() => void>();
const subscribe = (callback: () => void) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};
const readCookie = () => {
  const part = document.cookie.split(";").find((p) => p.trim().startsWith(`${CONSENT_COOKIE}=`));
  return part?.trim() ?? "";
};

function loadStatistics() {
  if (!UMAMI_SRC || !UMAMI_ID || document.getElementById("jp-umami")) return;
  const script = document.createElement("script");
  script.id = "jp-umami";
  script.src = UMAMI_SRC;
  script.defer = true;
  script.dataset.websiteId = UMAMI_ID;
  document.head.appendChild(script);
}

/**
 * Our own consent manager (no third-party CMP). Only strictly necessary cookies before a choice;
 * statistics load after "Accept" and never otherwise. Accept and reject have the same weight;
 * the choice can be changed at any time from the footer ("Cookie settings").
 */
export function CookieConsent() {
  const t = useTranslations("web.cookies");
  const id = useId();
  // null on the server and during hydration: the banner never flashes for visitors who already chose.
  const raw = useSyncExternalStore(subscribe, readCookie, () => null);
  const consent = raw === null ? null : parseConsent(raw);
  const [settings, setSettings] = useState(false);
  const [stats, setStats] = useState(false);

  useEffect(() => {
    const open = () => {
      setStats(parseConsent(readCookie())?.stats ?? false);
      setSettings(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, open);
  }, []);

  useEffect(() => {
    if (consent?.stats) loadStatistics();
  }, [consent?.stats]);

  const save = (allowStats: boolean) => {
    const wasLoaded = Boolean(document.getElementById("jp-umami"));
    document.cookie = serializeConsent(allowStats, Date.now(), window.location.protocol === "https:");
    setSettings(false);
    listeners.forEach((l) => l());
    // Withdrawing consent: reload so that the statistics script is gone from this page too.
    if (wasLoaded && !allowStats) window.location.reload();
  };

  if (raw === null || (consent && !settings)) return null;
  return (
    <section className="cookie-banner" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{t("title")}</h2>
      <p>
        {t("text")} <Link href="/cookies">{t("policy")}</Link>
      </p>
      {settings && (
        <fieldset className="cookie-options">
          <legend className="sr-only">{t("settings")}</legend>
          <label>
            <input type="checkbox" checked disabled />
            {t("necessary")}
          </label>
          <label>
            <input type="checkbox" name="statistics" checked={stats} onChange={(e) => setStats(e.target.checked)} />
            {t("statistics")}
          </label>
        </fieldset>
      )}
      <div className="cookie-actions">
        {settings ? (
          <button type="button" className="btn btn-primary" onClick={() => save(stats)}>
            {t("save")}
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-secondary" onClick={() => save(false)}>
              {t("reject")}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => save(true)}>
              {t("accept")}
            </button>
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setStats(false);
                setSettings(true);
              }}
            >
              {t("settings")}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

export function CookieSettingsButton({ label }: { label: string }) {
  return (
    <button type="button" className="link-button" onClick={() => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))}>
      {label}
    </button>
  );
}
