"use client";

/**
 * "Now at the club" (§9.2.4), read live from the public API every minute: the courts (free, busy
 * or closed, never who plays: R-012), the Match of the day, the top 3 Kings of the Jungle and the
 * next tournament. Names, rank, LP and level are the public league fields (R-012, Q49). While the
 * data is on its way the panels keep their size (no jump of the page).
 */
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CLUB_TZ, clubClock, clubDay, type CourtNow, courtsNow, nextTournament, type Tournament } from "@/lib/live";
import { LOCATION_SLUG } from "@/lib/site";

export const REFRESH_MS = 60_000;

type Person = { first_name: string; last_name: string };
type Ranked = { tier: string; division: string; lp: number };
type King = Ranked & { position: number; players: Person[] };
type Spotlight = { found: boolean; court: string; starts_at?: string | null; players: (Person & Ranked)[] };
type Live = { at: Date; open: string; courts: CourtNow[] | null; kings: King[]; spotlight: Spotlight | null; next: Tournament | null };

const names = (people: Person[]) => people.map((p) => `${p.first_name} ${p.last_name}`).join(" & ");

export function LiveClub() {
  const t = useTranslations("web.site.live");
  const locale = useLocale();
  const [live, setLive] = useState<Live | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const now = new Date();
      const query = { location: LOCATION_SLUG };
      // The Kings exist only in a running season: without one the site does not ask (no failed
      // request in the visitor's browser before the first season).
      const kingsOfSeason = async (): Promise<King[]> => {
        const seasons = await api.GET("/api/v1/league/seasons", { params: { query } });
        if (!seasons.data?.some((season) => season.status === "active")) return [];
        return (await api.GET("/api/v1/league/kings", { params: { query } })).data ?? [];
      };
      const [day, kings, spotlight, tournaments] = await Promise.allSettled([
        api.GET("/api/v1/bookings/availability", { params: { query: { ...query, day: clubDay(now) } } }),
        kingsOfSeason(),
        api.GET("/api/v1/league/match-of-the-day", { params: { query } }),
        api.GET("/api/v1/league/tournaments", { params: { query } }),
      ]);
      if (!alive) return;
      const availability = day.status === "fulfilled" ? (day.value.data ?? null) : null;
      setLive({
        at: now,
        open: availability?.open ?? "",
        courts: availability ? courtsNow(availability, now) : null,
        kings: kings.status === "fulfilled" ? kings.value.slice(0, 3) : [],
        spotlight: spotlight.status === "fulfilled" ? (spotlight.value.data ?? null) : null,
        next: tournaments.status === "fulfilled" ? nextTournament(tournaments.value.data ?? [], now) : null,
      });
    };
    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const when = (iso: string) => clubClock(new Date(iso));
  const date = (iso: string) =>
    new Intl.DateTimeFormat(locale, { timeZone: CLUB_TZ, day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const rank = (r: Ranked) => t("rank", { tier: t(`tiers.${r.tier}`), division: r.division, lp: r.lp });
  const court = (c: CourtNow) =>
    c.state === "busy"
      ? t("courts.busy", { time: when(c.until) })
      : c.state === "closed"
        ? t("courts.closed", { time: live?.open ?? "" })
        : c.until
          ? t("courts.freeUntil", { time: when(c.until) })
          : t("courts.free");

  return (
    <div className="live" aria-busy={live === null}>
      <p className="live__status">
        <span className="live__dot" aria-hidden="true" />
        {live === null ? t("loading") : live.courts === null ? t("unavailable") : t("updated", { time: clubClock(live.at) })}
      </p>
      <div className="live__grid">
        <section className="live__panel live__courts" aria-labelledby="live-courts">
          <h3 id="live-courts">{t("courts.title")}</h3>
          <ul className="live__list">
            {(live?.courts ?? []).map((c) => (
              <li key={c.id} data-state={c.state}>
                <span className="live__name">{c.name}</span>
                <span key={court(c)} className="live__state fx-pop">
                  {court(c)}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="live__panel" aria-labelledby="live-spotlight">
          <h3 id="live-spotlight">{t("spotlight.title")}</h3>
          {live?.spotlight?.found ? (
            <>
              <p className="live__match">{names(live.spotlight.players)}</p>
              <p className="muted">
                {live.spotlight.starts_at
                  ? t("spotlight.where", { court: live.spotlight.court, time: when(live.spotlight.starts_at) })
                  : live.spotlight.court}
              </p>
            </>
          ) : (
            <p className="muted">{t("spotlight.none")}</p>
          )}
        </section>
        <section className="live__panel" aria-labelledby="live-kings">
          <h3 id="live-kings">{t("kings.title")}</h3>
          {live?.kings.length ? (
            <ol className="live__list">
              {live.kings.map((k) => (
                <li key={`${k.position}-${names(k.players)}`}>
                  <span className="live__name">
                    {k.position}. {names(k.players)}
                  </span>
                  <span className="live__state">{rank(k)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">{t("kings.none")}</p>
          )}
        </section>
        <section className="live__panel" aria-labelledby="live-next">
          <h3 id="live-next">{t("next.title")}</h3>
          {live?.next ? (
            <>
              <p className="live__match">{live.next.name}</p>
              <p className="muted">{t("next.when", { date: date(live.next.starts_at) })}</p>
            </>
          ) : (
            <p className="muted">{t("next.none")}</p>
          )}
        </section>
      </div>
    </div>
  );
}
