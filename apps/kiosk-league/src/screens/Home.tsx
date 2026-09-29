/** After the scan (§8.2): the minimal private summary (name, rank, LP, level, place, matches
 * against the minimum) and the actions, with what is waiting for the player. */
import { formatTime, rankName } from "../lib/i18n";
import { useKiosk, useT, type Screen } from "../kiosk";

function Tile({ label, count, onClick }: { label: string; count?: number; onClick: () => void }) {
  const t = useT();
  return (
    <button type="button" className="tile" onClick={onClick}>
      <span className="tile__label">{label}</span>
      {count ? <span className="tile__count">{t("actions.count", { count })}</span> : null}
    </button>
  );
}

export function Home() {
  const kiosk = useKiosk();
  const { session, api, lang } = kiosk;
  const t = useT();
  if (!session) return null;
  const go = (screen: Screen) => () => kiosk.goto(screen);
  const needsConsent = session.adult && (!session.consent_signed || session.consent_outdated);

  const checkIn = async () => {
    try {
      const done = await api.checkIn(kiosk.card);
      kiosk.notify(t("checkIn.done", { name: done.first_name, time: formatTime(lang, done.scanned_at) }));
    } catch (error) {
      kiosk.fail(error);
    }
  };

  return (
    <div className="home">
      <section className="panel">
        <h1>{t("session.hello", { name: session.player.first_name })}</h1>
        {session.ladders.map((l) => (
          <p key={l.ladder} className="summary">
            <strong>{t(`session.ladder.${l.ladder}`)}</strong>{" "}
            {l.position ? t("session.position", { position: l.position }) : t("session.unranked", { left: l.placement_left })}
            {" · "}
            {l.tier ? `${rankName(lang, l.tier, l.division)} · ` : ""}
            {t("session.lp", { lp: l.lp })} · {t("session.level", { level: l.level.toFixed(2) })}
            <br />
            <span className="muted">{t("session.played", { played: l.matches_played, minimum: l.minimum })}</span>
          </p>
        ))}
        {!session.in_league ? (
          <div className="notice">
            <p>{t("session.notInLeague")}</p>
            {session.adult ? <p className="muted">{t(`session.questionnaire.${session.questionnaire}`)}</p> : null}
          </div>
        ) : null}
        {!session.adult ? <p className="notice">{t("session.minor")}</p> : null}
        {session.consent_signed && session.consent_outdated ? (
          <p className="notice">{t("session.consentOutdated")}</p>
        ) : null}
      </section>
      <nav className="tiles" aria-label={t("title")}>
        {needsConsent ? <Tile label={t("actions.consent")} onClick={go("consent")} /> : null}
        {session.in_league ? (
          <>
            <Tile label={t("actions.score")} count={session.score_chances.length} onClick={go("score")} />
            <Tile label={t("actions.confirm")} count={session.to_confirm.length} onClick={go("confirm")} />
            <Tile label={t("actions.challenges")} count={session.challenges.length} onClick={go("challenges")} />
          </>
        ) : null}
        {session.fixtures.length ? (
          <Tile label={t("actions.fixtures")} count={session.fixtures.length} onClick={go("fixtures")} />
        ) : null}
        <Tile label={t("actions.checkIn")} onClick={() => void checkIn()} />
        <Tile label={t("actions.teams")} onClick={go("teams")} />
        <Tile label={t("actions.standings")} onClick={go("standings")} />
      </nav>
    </div>
  );
}

export function Back() {
  const kiosk = useKiosk();
  const t = useT();
  return (
    <button type="button" className="button button--quiet back" onClick={() => kiosk.goto("home")}>
      ← {t("actions.back")}
    </button>
  );
}
