/**
 * The screen at a court (§8.5). During a session, as in the example:
 *
 *   TEREN 4 · 14:00–15:30 · 90 MIN · MECI OFICIAL DE LIGĂ
 *   Popescu Alexandru Daniel   Diamant II · 67 LP · Nivel 5.2
 *   …                vs                …
 *   Timp rămas: 00:47 · Următorul: 15:30 Antrenament
 *
 * with "Meciul zilei" when it is, and the QR code to the public league pages. While the court
 * is free: the jungle, what comes next, the standings, the events and the club's announcements.
 */
import type { ScreenState } from "../api";
import { formatTime, type Lang, sessionType, t, upper } from "../i18n";
import { Announcements, Events, Jungle, MatchOfTheDay, NextUp, Qr, Standings, Teams, TimeLeft } from "./parts";

export function Court({ lang, state, now }: { lang: Lang; state: ScreenState; now: number }) {
  const court = state.court;
  if (!court) return null;
  const session = court.current;
  if (!session) {
    return (
      <main className="screen screen--idle" lang={lang}>
        <Jungle />
        <header className="screen__head">
          <h1 className="court__name">{court.name}</h1>
          <p className="court__free">{t(lang, "freeNow")}</p>
          <p className="court__next">
            <NextUp lang={lang} next={court.next} />
          </p>
        </header>
        <div className="screen__grid">
          <Standings lang={lang} title={t(lang, "standings")} rows={state.league.doubles} />
          <div className="screen__column">
            <Events lang={lang} events={state.events} />
            <Qr lang={lang} state={state} />
          </div>
        </div>
        <Announcements lang={lang} items={state.announcements} />
      </main>
    );
  }
  const heading = [
    court.name,
    `${formatTime(lang, session.starts_at)}–${formatTime(lang, session.ends_at)}`,
    t(lang, "minutes", { minutes: session.minutes }),
    sessionType(lang, session.session_type),
  ].join(" · ");
  return (
    <main className="screen screen--court" lang={lang}>
      <header className="screen__head">
        <h1 className="court__line">{upper(lang, heading)}</h1>
        {session.match_of_the_day ? <MatchOfTheDay lang={lang} /> : null}
      </header>
      <Teams lang={lang} session={session} />
      <footer className="court__foot">
        <p className="court__time">
          <TimeLeft lang={lang} session={session} now={now} />
          {court.next ? (
            <>
              {" · "}
              <NextUp lang={lang} next={court.next} />
            </>
          ) : null}
        </p>
        <Qr lang={lang} state={state} />
      </footer>
    </main>
  );
}
