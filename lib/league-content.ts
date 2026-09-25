import "server-only";
import { cache } from "react";
import { db } from "./db";
import { t } from "./i18n-content";
import { publicPlayerName, standings, type StandingRow } from "./league";
import type { Locale } from "@/i18n/routing";

export type LeagueTable = {
  division: string | null;
  rows: (StandingRow & { name: string })[];
};

export type LeagueMatchView = {
  id: string;
  division: string | null;
  playerA: string;
  playerB: string;
  playedOn: Date | null;
  score: string | null;
  winner: "A" | "B" | null;
  walkover: boolean;
};

export type LeagueSeasonView = {
  id: string;
  name: string;
  startsOn: Date | null;
  endsOn: Date | null;
  rules: string;
  registrationOpen: boolean;
  tables: LeagueTable[];
  results: LeagueMatchView[];
  upcoming: LeagueMatchView[];
};

type SeasonRow = Awaited<ReturnType<typeof loadSeasons>>[number];

const loadSeasons = cache(async () =>
  db.leagueSeason.findMany({
    where: { published: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: {
      matches: {
        include: {
          playerA: { select: { id: true, name: true } },
          playerB: { select: { id: true, name: true } },
        },
        orderBy: [{ playedOn: "desc" }, { createdAt: "desc" }],
      },
    },
  }),
);

function toView(season: SeasonRow, locale: Locale): LeagueSeasonView {
  const names = new Map<string, string>();
  for (const match of season.matches) {
    names.set(match.playerA.id, publicPlayerName(match.playerA.name));
    names.set(match.playerB.id, publicPlayerName(match.playerB.name));
  }
  const divisions = [...new Set(season.matches.map((m) => m.division?.trim() || null))].sort(
    (a, b) => (a ?? "").localeCompare(b ?? "", "ro"),
  );
  const tables = divisions.map((division) => ({
    division,
    rows: standings(
      season.matches.filter((m) => (m.division?.trim() || null) === division),
      { win: season.pointsWin, loss: season.pointsLoss },
    )
      .filter((row) => row.played > 0)
      .map((row) => ({ ...row, name: names.get(row.playerId) ?? "" })),
  }));
  const matches: LeagueMatchView[] = season.matches.map((m) => ({
    id: m.id,
    division: m.division?.trim() || null,
    playerA: names.get(m.playerA.id) ?? "",
    playerB: names.get(m.playerB.id) ?? "",
    playedOn: m.playedOn,
    score: m.score,
    winner: m.winner,
    walkover: m.walkover,
  }));
  const played = (m: LeagueMatchView) => Boolean(m.score || m.winner);
  return {
    id: season.id,
    name: t(season.name, locale),
    startsOn: season.startsOn,
    endsOn: season.endsOn,
    rules: season.rules ? t(season.rules, locale) : "",
    registrationOpen: season.registrationOpen,
    tables: tables.filter((table) => table.rows.length > 0),
    results: matches.filter(played).slice(0, 20),
    upcoming: matches
      .filter((m) => !played(m))
      .sort((a, b) => (a.playedOn?.getTime() ?? Infinity) - (b.playedOn?.getTime() ?? Infinity)),
  };
}

/** The season on the league page: the first published one. */
export const getCurrentSeason = cache(async (locale: Locale) => {
  const [season] = await loadSeasons();
  return season ? toView(season, locale) : null;
});

/** Finished seasons and their winners (first of each table), for the club's honours. */
export const getLeagueChampions = cache(async (locale: Locale) => {
  const seasons = await loadSeasons();
  const today = new Date();
  return seasons
    .filter((season) => season.endsOn && season.endsOn.getTime() < today.getTime())
    .map((season) => toView(season, locale))
    .flatMap((season) =>
      season.tables
        .filter((table) => table.rows[0])
        .map((table) => ({
          season: season.name,
          division: table.division,
          champion: table.rows[0]!.name,
          endsOn: season.endsOn,
        })),
    );
});

export type PartnerView = {
  id: string;
  name: string;
  level: string;
  slots: string[];
  singles: boolean;
  doubles: boolean;
  about: string | null;
};

/** The players the club approved who asked to be on the public list. */
export const getPartnerBoard = cache(async (): Promise<PartnerView[]> => {
  const players = await db.amateurPlayer.findMany({
    where: { approved: true, listed: true, lookingForPartner: true },
    orderBy: [{ level: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
  return players.map((p) => ({
    id: p.id,
    name: publicPlayerName(p.name),
    level: p.level,
    slots: p.slots,
    singles: p.singles,
    doubles: p.doubles,
    about: p.about,
  }));
});
