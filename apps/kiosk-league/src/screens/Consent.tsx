/** Joining the league (§8.2 action 1, R-010, R-011): the full consent text, the mandatory
 * tick, then the signature, here at the League Kiosk. */
import { useEffect, useState } from "react";
import type { ConsentText } from "../lib/api";
import { useKiosk, useT } from "../kiosk";
import { Back } from "./Home";

export function Consent() {
  const kiosk = useKiosk();
  const t = useT();
  const [text, setText] = useState<ConsentText | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  const { api, lang, fail } = kiosk;
  useEffect(() => {
    api.consentText(lang).then(setText, fail);
  }, [api, lang, fail]);

  const sign = async () => {
    setBusy(true);
    try {
      await kiosk.api.signConsent(kiosk.card, kiosk.lang);
      kiosk.notify(t("consent.done"));
      await kiosk.refresh();
      kiosk.goto("home");
    } catch (error) {
      kiosk.fail(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel consent">
      <Back />
      <h1>{text?.title ?? t("consent.title")}</h1>
      {text ? <p className="muted">{t("consent.version", { version: text.version })}</p> : null}
      <div className="consent__text" tabIndex={0}>
        {text?.body}
      </div>
      <label className="check">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        <span>{t("consent.accept")}</span>
      </label>
      <button type="button" className="button button--primary" disabled={!accepted || busy} onClick={() => void sign()}>
        {t("consent.submit")}
      </button>
    </section>
  );
}
