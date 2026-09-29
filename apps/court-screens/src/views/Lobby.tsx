/**
 * The lobby, café and mezzanine screens (§8.5): every court's state, the Match of the day, the
 * standings, the Kings of the Jungle, the events and the café orders ready to collect.
 */
import type { CourtState, ScreenState } from "../api";
import { formatTime, type Lang, playerName, sessionType, t } from "../i18n";
import { Announcements, Events, MatchOfTheDay, NextUp, Qr, Standings, Teams, TimeLeft } from "./parts";

function CourtCard({ lang, court, now }: { lang: Lang; court: CourtState; now: number }) {
  const session = court.current;
  return (
    <article className={session ? "court-card court-card--busy" : "court-card"} aria-label={court.name}>
      <h2 className="court-card__name">
        {court.name} {session?.match_of_the_day ? <MatchOfTheDay lang={lang} /> : null}
      </h2>
      {session ? (
        <>
          <p className="court-card__type">
            {sessionType(lang, session.session_type)} · {formatTime(lang, session.starts_at)}–
            {formatTime(lang, session.ends_at)}
          </p>
          <p className="court-card__players">
            {session.teams.map((team) => team.map((p) => playerName(lang, p)).join(" & ")).join(` ${t(lang, "vs")} `)}
          </p>
          <p className="muted">
            <TimeLeft lang={lang} session={session} now={now} />
          </p>
        </>
      ) : (
        <p className="court-card__free">{t(lang, "free")}</p>
      )}
      {court.next ? (
        <p className="muted">
          <NextUp lang={lang} next={court.next} />
        </p>
      ) : null}
    </article>
  );
}

export function Lobby({ lang, state, now }: { lang: Lang; state: ScreenState; now: number }) {
  const league = state.league;
  const spotlight = league.match_of_the_day;
  return (
    <main className="screen screen--lobby" lang={lang}>
      <header className="screen__head screen__head--row">
        <h1 className="brand">Jungle Padel</h1>
        <div className="screen__head-end">
          <Qr lang={lang} state={state} />
          <p className="clock">{formatTime(lang, new Date(now).toISOString())}</p>
        </div>
      </header>
      <div className="lobby">
        <section className="lobby__courts" aria-label={t(lang, "courts")}>
          {state.courts.map((court) => (
            <CourtCard key={court.id} lang={lang} court={court} now={now} />
          ))}
        </section>
        <div className="lobby__side">
          {state.cafe_ready.length > 0 ? (
            <section className="panel cafe-ready" aria-label={t(lang, "cafeReady")}>
              <h2>{t(lang, "cafeReady")}</h2>
              <ul className="cafe-ready__numbers">
                {state.cafe_ready.map((number) => (
                  <li key={number}>{number}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {spotlight ? (
            <section className="panel spotlight" aria-label={t(lang, "matchOfTheDay")}>
              <h2>
                {t(lang, "matchOfTheDay")} · {league.match_of_the_day_court} ·{" "}
                {formatTime(lang, spotlight.starts_at)}
              </h2>
              <Teams lang={lang} session={spotlight} />
            </section>
          ) : null}
          <Standings lang={lang} title={t(lang, "kings")} rows={league.kings} />
          <Standings lang={lang} title={t(lang, "standings")} rows={league.doubles} />
          <Standings lang={lang} title={t(lang, "pairs")} rows={league.pairs} />
          <Standings lang={lang} title={t(lang, "singles")} rows={league.singles} />
          <Events lang={lang} events={state.events} />
        </div>
      </div>
      <Announcements lang={lang} items={state.announcements} />
    </main>
  );
}
