/**
 * Pieces shared by the court and lobby screens: the players of a session, the standings, the
 * events, the club's announcements (rotating), the QR code to the public league pages, the
 * animated "jungle" (still when the viewer asks for reduced motion) and the discreet
 * connection indicator. Only public fields (R-012) ever reach these components.
 */
import { useEffect, useState } from "react";
import type { Row, ScreenState, Session } from "../api";
import { formatDate, formatTime, type Lang, playerDetails, playerName, rowDetails, sessionType, t } from "../i18n";
import type { LiveStatus } from "../live";
import { hoursMinutes, minutesLeft } from "../time";

export const ROTATE_MS = 12_000;

export function Teams({ lang, session }: { lang: Lang; session: Session }) {
  return (
    <div className="teams">
      {session.teams.map((team, index) => (
        <div key={index} className="teams__side">
          {index > 0 ? (
            <p className="teams__vs" aria-label={t(lang, "versus")}>
              {t(lang, "vs")}
            </p>
          ) : null}
          <ul className="team">
            {team.map((player, position) => (
              <li key={`${player.name}:${position}`} className="player">
                <span className={player.name ? "player__name" : "player__name player__name--anonymous"}>
                  {playerName(lang, player)}
                  {player.in_league ? <span className="badge badge--league">{t(lang, "leagueBadge")}</span> : null}
                </span>
                <span className="player__details">{playerDetails(lang, player)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function TimeLeft({ lang, session, now }: { lang: Lang; session: Session; now: number }) {
  return <>{t(lang, "timeLeft", { time: hoursMinutes(minutesLeft(session.ends_at, now)) })}</>;
}

export function NextUp({ lang, next }: { lang: Lang; next: { starts_at: string; session_type: string } | null }) {
  if (!next) return null;
  return <>{t(lang, "next", { time: next.starts_at, type: sessionType(lang, next.session_type) })}</>;
}

export function MatchOfTheDay({ lang }: { lang: Lang }) {
  return <span className="badge badge--spotlight">{t(lang, "matchOfTheDay")}</span>;
}

export function Standings({ lang, title, rows }: { lang: Lang; title: string; rows: Row[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="panel standings" aria-label={title}>
      <h2>{title}</h2>
      <ol className="standings__rows">
        {rows.map((row) => (
          <li key={`${row.position}:${row.names.join("+")}`} className="standings__row">
            <span className="standings__position">{row.position}</span>
            <span className="standings__names">{row.names.join(" & ")}</span>
            <span className="standings__details">{rowDetails(lang, row)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Events({ lang, events }: { lang: Lang; events: ScreenState["events"] }) {
  if (events.length === 0) return null;
  return (
    <section className="panel" aria-label={t(lang, "events")}>
      <h2>{t(lang, "events")}</h2>
      <ul className="events">
        {events.map((event) => (
          <li key={`${event.title}:${event.starts_at ?? ""}`}>
            <span className="events__title">{event.title}</span>
            {event.starts_at ? (
              <span className="muted">
                {" "}
                · {formatDate(lang, event.starts_at)}, {formatTime(lang, event.starts_at)}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The club's own messages (§8.5 "reclame interne"), one at a time. */
export function Announcements({ lang, items }: { lang: Lang; items: ScreenState["announcements"] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (items.length < 2) return;
    const timer = setInterval(() => setIndex((i) => i + 1), ROTATE_MS);
    return () => clearInterval(timer);
  }, [items.length]);
  if (items.length === 0) return null;
  const item = items[index % items.length];
  const text = item?.[lang] ?? item?.ro ?? "";
  return (
    <p className="announcement" aria-label={t(lang, "announcement")}>
      {text}
    </p>
  );
}

/** The server draws the QR code (an SVG in the text colour); anything else is not shown. */
export function safeSvg(svg: string): boolean {
  return /^<svg[\s>]/.test(svg) && !/<script|<foreignObject|\son[a-z]+\s*=|javascript:/i.test(svg);
}

export function Qr({ lang, state }: { lang: Lang; state: ScreenState }) {
  if (!state.qr_svg || !safeSvg(state.qr_svg)) return null;
  return (
    <figure className="qr">
      <div
        className="qr__code"
        role="img"
        aria-label={t(lang, "qrAlt", { url: state.qr_url })}
        // Drawn by the club's server (segno) and checked by safeSvg above.
        dangerouslySetInnerHTML={{ __html: state.qr_svg }}
      />
      <figcaption>{t(lang, "qr")}</figcaption>
    </figure>
  );
}

/** A decorative jungle: leaves swaying slowly (none of it when reduced motion is asked). */
export function Jungle() {
  return (
    <svg className="jungle" viewBox="0 0 400 240" aria-hidden="true" focusable="false">
      <g className="jungle__layer jungle__layer--back">
        <path d="M20 240 C40 150 90 110 150 90 C110 130 80 180 70 240 Z" />
        <path d="M380 240 C360 160 320 120 250 100 C300 140 320 190 330 240 Z" />
      </g>
      <g className="jungle__layer jungle__layer--middle">
        <path d="M90 240 C110 170 160 140 220 130 C170 160 140 200 135 240 Z" />
        <path d="M310 240 C290 180 250 150 190 140 C240 170 260 210 265 240 Z" />
      </g>
      <g className="jungle__layer jungle__layer--front">
        <path d="M160 240 C170 200 200 180 240 175 C210 195 195 215 192 240 Z" />
        <circle cx="200" cy="60" r="16" className="jungle__ball" />
      </g>
    </svg>
  );
}

export function Connection({ lang, status, receivedAt }: { lang: Lang; status: LiveStatus; receivedAt: number | null }) {
  const live = status === "live";
  const label = live ? t(lang, "live") : t(lang, "reconnecting");
  return (
    <p className={live ? "connection connection--live" : "connection"} role="status">
      <span className="connection__dot" aria-hidden="true" />
      <span className={live ? "visually-hidden" : undefined}>{label}</span>
      {!live && receivedAt !== null ? (
        <span className="connection__stale"> · {t(lang, "stale", { time: new Date(receivedAt).toISOString() })}</span>
      ) : null}
    </p>
  );
}
