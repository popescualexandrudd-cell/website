/** The idle screen (§8.2): live standings rotating Doubles / Singles / Pairs, the Match of the
 * day, the Kings of the Jungle, today's challenges and "Scan your card". */
import { useEffect, useEffectEvent, useState } from "react";
import { type Idle, Offline, type Standing } from "../lib/api";
import { formatTime, rankName } from "../lib/i18n";
import { useKiosk, useT } from "../kiosk";
import { Standings } from "./Standings";

const LADDERS = ["doubles", "singles", "pairs"] as const;
export const ROTATE_MS = 10_000;
export const REFRESH_MS = 30_000;

export function names(people: { first_name: string; last_name: string }[]): string {
  return people.map((p) => `${p.first_name} ${p.last_name}`).join(" & ");
}

export function StandingRows({ rows }: { rows: Standing[] }) {
  const t = useT();
  const { lang } = useKiosk();
  return (
    <ol className="standings">
      {rows.map((row) => (
        <li key={`${row.position}-${names(row.players)}`} className="standings__row">
          <span className="standings__position">{row.position}</span>
          <span className="standings__name">{names(row.players)}</span>
          <span className="standings__rank">
            {rankName(lang, row.tier, row.division)} · {t("session.level", { level: row.level.toFixed(2) })}
            {row.eligible ? "" : ` · ${t("standings.notEligible")}`}
          </span>
          <span className="standings__lp">{t("session.lp", { lp: row.lp })}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * `idle` is kept by the kiosk between sessions: after a logout the screen comes back with the
 * standings already there (no empty flash, no jump of the page when they arrive), then refreshes.
 * `aria-busy` says whether the screen is still loading.
 */
export function IdleScreen({
  idle,
  onLoaded,
  onBack,
  onOffline,
}: {
  idle: Idle | null;
  onLoaded: (idle: Idle) => void;
  onBack: () => void;
  onOffline: () => void;
}) {
  const { api, lang } = useKiosk();
  const t = useT();
  const [ladder, setLadder] = useState(0);
  const [browsing, setBrowsing] = useState(false);
  // The loading and the rotation depend only on the API, never on the parent's callbacks (a new
  // function at each render would reload the standings and restart the rotation each time).
  const loaded = useEffectEvent(onLoaded);
  const back = useEffectEvent(onBack);
  const offline = useEffectEvent(onOffline);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .idle()
        .then((data) => {
          if (!alive) return;
          loaded(data);
          back();
        })
        .catch((error: unknown) => {
          if (error instanceof Offline) offline();
        });
    void load();
    const refresh = setInterval(load, REFRESH_MS);
    const rotate = setInterval(() => setLadder((n) => (n + 1) % LADDERS.length), ROTATE_MS);
    return () => {
      alive = false;
      clearInterval(refresh);
      clearInterval(rotate);
    };
  }, [api]);

  if (browsing) {
    return <Standings onClose={() => setBrowsing(false)} />;
  }
  const shown = LADDERS[ladder] ?? "doubles";
  const rows = idle ? idle[shown] : [];
  const motd = idle?.match_of_the_day;

  return (
    <div className="idle" aria-busy={idle === null}>
      <section className="panel idle__standings" aria-live="polite">
        <h2>{t(`idle.${shown}`)}</h2>
        {rows.length ? <StandingRows rows={rows} /> : <p className="muted">{t("idle.empty")}</p>}
        <button type="button" className="button" onClick={() => setBrowsing(true)}>
          {t("idle.standingsButton")}
        </button>
      </section>
      <div className="idle__side">
        <section className="panel">
          <h2>{t("idle.matchOfTheDay")}</h2>
          {motd?.found ? (
            <>
              <p className="motd">{motd.players.map((p) => `${p.first_name} ${p.last_name}`).join(" · ")}</p>
              {motd.starts_at ? (
                <p className="muted">{t("idle.court", { court: motd.court, time: formatTime(lang, motd.starts_at) })}</p>
              ) : null}
            </>
          ) : (
            <p className="muted">{t("idle.noMatchOfTheDay")}</p>
          )}
        </section>
        <section className="panel">
          <h2>{t("idle.kings")}</h2>
          {idle?.kings.length ? <StandingRows rows={idle.kings} /> : <p className="muted">{t("idle.empty")}</p>}
        </section>
        <section className="panel">
          <h2>{t("idle.challenges")}</h2>
          {idle?.challenges.length ? (
            <ul className="plain">
              {idle.challenges.map((c) => (
                <li key={`${c.created_at}-${names(c.challengers)}`}>
                  {names(c.challengers)} <span className="muted">{t("idle.vs")}</span> {names(c.targets)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t("idle.noChallenges")}</p>
          )}
        </section>
      </div>
      <section className="scan-call" aria-label={t("idle.scan")}>
        <p className="scan-call__title">{t("idle.scan")}</p>
        <p className="muted">{t("idle.scanHint")}</p>
      </section>
    </div>
  );
}
