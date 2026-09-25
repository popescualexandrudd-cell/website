import type { TournamentOrganizer } from "../../../lib/generated/prisma/client";

type T = { ro: string; en: string };

/**
 * Tournaments the club has hosted, as they appear in the calendars of the Romanian Tennis
 * Federation (frt.ro) and Tenis10 (tenis10.ro). No dates: the club adds each edition, with its
 * dates and registration link, from the admin.
 */
export const tournamentContent: {
  slug: string;
  name: T;
  organizer: TournamentOrganizer;
  category: T;
  summary: T;
}[] = [
  {
    slug: "cupa-elite-pantelimon",
    name: { ro: "Cupa Elite Pantelimon", en: "Cupa Elite Pantelimon" },
    organizer: "FRT",
    category: {
      ro: "Calendarul Federației Române de Tenis",
      en: "Romanian Tennis Federation calendar",
    },
    summary: {
      ro: "Turneu din calendarul Federației Române de Tenis, jucat pe terenurile de zgură ale clubului.",
      en: "A tournament in the Romanian Tennis Federation calendar, played on the club's clay courts.",
    },
  },
  {
    slug: "cupa-elite-tenis",
    name: { ro: "Cupa Elite Tenis", en: "Cupa Elite Tenis" },
    organizer: "FRT",
    category: {
      ro: "Calendarul Federației Române de Tenis",
      en: "Romanian Tennis Federation calendar",
    },
    summary: {
      ro: "Turneul clubului în calendarul Federației Române de Tenis.",
      en: "The club's tournament in the Romanian Tennis Federation calendar.",
    },
  },
  {
    slug: "cupa-elite-tenis-challenge",
    name: { ro: "Cupa Elite Tenis Challenge", en: "Cupa Elite Tenis Challenge" },
    organizer: "TENIS10",
    category: { ro: "Tenis10, copii până la 10 ani", en: "Tenis10, children up to 10" },
    summary: {
      ro: "Competiție Tenis10: copiii joacă pe terenuri și cu mingi pe măsura lor, după conceptul ITF „Play and Stay”.",
      en: "A Tenis10 competition: children play on courts and with balls their size, following the ITF “Play and Stay” concept.",
    },
  },
  {
    slug: "super-turneul-campionilor-tenis10",
    name: { ro: "Super-Turneul Campionilor", en: "Super-Turneul Campionilor" },
    organizer: "TENIS10",
    category: { ro: "Tenis10, copii până la 10 ani", en: "Tenis10, children up to 10" },
    summary: {
      ro: "Turneul campionilor din circuitul Tenis10, găzduit la Elite Tenis Club.",
      en: "The champions' tournament of the Tenis10 circuit, hosted at Elite Tenis Club.",
    },
  },
];
