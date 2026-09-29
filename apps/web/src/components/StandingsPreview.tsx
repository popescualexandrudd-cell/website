"use client";

/**
 * The live standings preview of the league section (§9.2.7): the top 5 of the doubles standings in
 * the running season, read from the public API every minute. Only the public fields: names, rank,
 * level and LP (R-012; a deleted account comes as "Jucător retras"). Before the first season the site does not ask (no failed request in the
 * visitor's browser) and says when the standings appear.
 */
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LOCATION_SLUG } from "@/lib/site";

export const TOP = 5;
const REFRESH_MS = 60_000;

type Row = {
  position: number;
  players: { first_name: string; last_name: string }[];
  tier: string;
  division: string;
  level: number;
  lp: number;
};

export function StandingsPreview() {
  const t = useTranslations("web.site.league");
  const locale = useLocale();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const query = { location: LOCATION_SLUG };
      const seasons = await api.GET("/api/v1/league/seasons", { params: { query } }).catch(() => null);
      const running = seasons?.data?.some((season) => season.status === "active") ?? false;
      const table = running
        ? await api.GET("/api/v1/league/standings", { params: { query } }).catch(() => null)
        : null;
      if (alive) setRows(table?.data?.slice(0, TOP) ?? []);
    };
    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const level = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return (
    <div className="standings" role="region" aria-labelledby="standings-title" aria-busy={rows === null}>
      <h3 id="standings-title" className="league__h3">
        {t("standings.title")}
      </h3>
      {rows === null ? (
        <p className="league__text">{t("standings.busy")}</p>
      ) : rows.length === 0 ? (
        <p className="league__text">{t("standings.empty")}</p>
      ) : (
        <div className="standings__scroll">
          <table className="standings__table">
            <thead>
              <tr>
                <th scope="col">{t("standings.position")}</th>
                <th scope="col">{t("standings.players")}</th>
                <th scope="col">{t("standings.rank")}</th>
                <th scope="col">{t("standings.level")}</th>
                <th scope="col">{t("standings.lp")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.position}>
                  <td>{row.position}</td>
                  <td>
                    {row.players.map((p) => `${p.first_name} ${p.last_name}`).join(" & ")}
                  </td>
                  <td>
                    {row.tier === "master" ? t("ranks.master") : `${t(`ranks.${row.tier}`)} ${row.division}`}
                  </td>
                  <td>{level.format(row.level)}</td>
                  <td>{row.lp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
