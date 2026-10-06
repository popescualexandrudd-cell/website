/** Site-wide constants. Only facts confirmed in docs/ or by the owner (no invented prices, numbers or reviews). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
/**
 * Where the server reads the API: inside the stack in production (`API_INTERNAL_URL`, the proxy's
 * internal listener), so the site never depends on reaching its own public address. In the
 * browser the variable does not exist and this is API_URL. Never put it in a link or the page.
 */
export const SERVER_API_URL = (process.env.API_INTERNAL_URL || API_URL).replace(/\/$/, "");
export const INDEXABLE = process.env.SITE_INDEXABLE === "true";

export const FACTS = {
  courts: 4, // §2.2
  loungeHeightM: 3, // owner, 27.09.2026: lounge suspended 3 m above the courts
  parking: 28, // §2.2: 18 + 10
  seasonsOfPlay: 4, // §2.2: heated in winter, cooled in summer
  reformersAtOpening: 4, // R-100
  seasonMonths: 3, // §6.13
} as const;

/** The opening hours, every day (Q3, confirmed by the owner on 27.09.2026). */
export const OPENING_HOURS: [string, string] = ["08:00", "23:00"];

export const ADDRESS = {
  street: "Șoseaua Biruinței",
  locality: "Pantelimon",
  region: "Ilfov",
  country: "RO",
} as const;

/** The club's location in the API (seed_initial): the live data of the home page is read for it. */
export const LOCATION_SLUG = "jungle-padel";

export const MAP_URL = "https://www.openstreetmap.org/search?query=Selgros%20Pantelimon";

/** ANPC alternative dispute resolution (SAL). The EU ODR platform closed on 20.07.2025 (Reg. (EU) 2024/3228). */
export const ANPC_SAL_URL = "https://anpc.ro/ce-este-sal/";

/** League card tiers shown on the site (visual status levels; the league ranks live in docs/03-liga). */
export const CARD_TIERS = ["silver", "gold", "platinum", "diamond"] as const;
export type CardTier = (typeof CARD_TIERS)[number];
