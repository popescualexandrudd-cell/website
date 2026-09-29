/** Freezing a subscription (§8.3 flow 4, R-086): up to 2 weeks a year; the subscription is
 * extended by the same number of days. The server checks the limit and the overlaps. */
import { useState } from "react";
import { useKiosk, useT } from "../kiosk";
import { formatDate } from "../lib/i18n";

const MAX_DAYS = 14;
const MAX_OFFSET = 30;

/** A day `offset` days from today, in club time. */
export function dayFrom(now: Date, offset: number): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(now);
  const moment = new Date(`${today}T12:00:00Z`);
  moment.setUTCDate(moment.getUTCDate() + offset);
  return moment.toISOString().slice(0, 10);
}

export function Freeze() {
  const { session, api, card, lang, goto, notify, fail, refresh } = useKiosk();
  const t = useT();
  const [chosen, setChosen] = useState(session?.subscriptions[0]?.id ?? "");
  const [offset, setOffset] = useState(1);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  if (!session) return null;
  const startsOn = dayFrom(new Date(), offset);

  const freeze = async () => {
    setBusy(true);
    try {
      const frozen = await api.freeze(chosen, card, startsOn, days);
      notify(t("freeze.done", { from: formatDate(lang, frozen.starts_on), until: formatDate(lang, frozen.ends_on) }));
      await refresh();
      goto("home");
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="home">
      <button type="button" className="button button--quiet back" onClick={() => goto("home")}>
        ← {t("actions.back")}
      </button>
      <h1>{t("freeze.title")}</h1>
      <p className="muted">{t("freeze.rule")}</p>
      <section className="panel">
        <div className="chips">
          {session.subscriptions.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`chip${chosen === s.id ? " chip--on" : ""}`}
              aria-pressed={chosen === s.id}
              onClick={() => setChosen(s.id)}
            >
              {s.description} · {t("freeze.until", { date: formatDate(lang, s.ends_on) })}
            </button>
          ))}
        </div>
        <div className="set__row">
          <span>{t("freeze.from")}</span>
          <span className="stepper">
            <button type="button" className="stepper__button" aria-label={t("freeze.earlier")} disabled={offset <= 0} onClick={() => setOffset(offset - 1)}>
              −
            </button>
            <span className="stepper__value stepper__value--wide">{formatDate(lang, startsOn)}</span>
            <button
              type="button"
              className="stepper__button"
              aria-label={t("freeze.later")}
              disabled={offset >= MAX_OFFSET}
              onClick={() => setOffset(offset + 1)}
            >
              +
            </button>
          </span>
        </div>
        <div className="set__row">
          <span>{t("freeze.days")}</span>
          <span className="stepper">
            <button type="button" className="stepper__button" aria-label={t("freeze.fewer")} disabled={days <= 1} onClick={() => setDays(days - 1)}>
              −
            </button>
            <span className="stepper__value">{days}</span>
            <button type="button" className="stepper__button" aria-label={t("freeze.more")} disabled={days >= MAX_DAYS} onClick={() => setDays(days + 1)}>
              +
            </button>
          </span>
        </div>
        <button type="button" className="button button--primary" disabled={!chosen || busy} onClick={() => void freeze()}>
          {t("freeze.submit", { days })}
        </button>
      </section>
    </div>
  );
}
