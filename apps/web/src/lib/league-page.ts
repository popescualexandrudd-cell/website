/**
 * The league page (§9.3 `/liga`) and the public player page, read on the server from the public
 * API: seasons, standings per ladder, the latest results, tournaments and a player's history. Only
 * the public fields (R-012 as changed by Q49): names, rank, level, LP, place, match results. The
 * website only shows the league (invariant 2); nothing is written from here.
 */
import { API_URL, LOCATION_SLUG } from "./site";

export const LADDERS = ["doubles", "singles", "pairs"] as const;
export type Ladder = (typeof LADDERS)[number];

export type PublicPlayer = { id: string | null; first_name: string; last_name: string };
export type Season = { id: string; number: number; name: string; starts_at: string; ends_at: string; status: string; is_calibration: boolean };
export type StandingRow = {
  position: number;
  players: PublicPlayer[];
  tier: string;
  division: string;
  level: number;
  lp: number;
  eligible: boolean;
};
export type SetScore = { a: number; b: number };
export type Result = {
  id: string;
  finished_at: string;
  court: string;
  kind: string;
  team_a: PublicPlayer[];
  team_b: PublicPlayer[];
  score: { sets?: SetScore[] } & Record<string, unknown>;
  winner: string;
  lp_delta: Record<string, number>;
};
export type Tournament = {
  id: string;
  name: string;
  format: string;
  team_size: number;
  status: string;
  starts_at: string;
  registration_closes_at: string;
  entry_fee: number;
  fee_provisional: boolean;
  max_entries: number;
  entries: number;
};
export type Profile = {
  player: PublicPlayer;
  ladders: { ladder: string; position: number | null; tier: string; division: string; level: number; lp: number }[];
  matches: Result[];
};

const REVALIDATE = 60;

async function read<T>(path: string, fetchImpl: typeof fetch): Promise<T | null> {
  try {
    const response = await fetchImpl(`${API_URL}/api/v1/league/${path}`, { next: { revalidate: REVALIDATE } });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

const where = (extra: Record<string, string> = {}) => new URLSearchParams({ location: LOCATION_SLUG, ...extra }).toString();

/** The seasons that started (newest first), or null when the API does not answer. */
export async function seasons(fetchImpl: typeof fetch = fetch): Promise<Season[] | null> {
  const list = await read<Season[]>(`seasons?${where()}`, fetchImpl);
  return list ? [...list].sort((a, b) => b.number - a.number) : null;
}

/** A season's standings on a ladder (the running season without `season`), or null. */
export async function standings(ladder: Ladder, season: number | null, fetchImpl: typeof fetch = fetch): Promise<StandingRow[] | null> {
  const extra: Record<string, string> = { ladder };
  if (season !== null) extra.season = String(season);
  return read<StandingRow[]>(`standings?${where(extra)}`, fetchImpl);
}

export async function results(limit: number, fetchImpl: typeof fetch = fetch): Promise<Result[] | null> {
  return read<Result[]>(`results?${where({ limit: String(limit) })}`, fetchImpl);
}

export async function tournaments(fetchImpl: typeof fetch = fetch): Promise<Tournament[] | null> {
  return read<Tournament[]>(`tournaments?${where()}`, fetchImpl);
}

/** A player's public page; null when unknown (or the id is not a UUID: no request is made). */
export async function profile(id: string, fetchImpl: typeof fetch = fetch): Promise<Profile | null> {
  if (!UUID.test(id)) return null;
  return read<Profile>(`players/${id}?${where()}`, fetchImpl);
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The page's choices from the address: an unknown ladder, season or rank falls back to the default. */
export type Filters = { ladder: Ladder; season: number | null; tier: string | null; q: string };

export const TIER_FILTERS = ["bronze", "silver", "gold", "platinum", "diamond", "master"] as const;

export function filtersFrom(params: Record<string, string | string[] | undefined>): Filters {
  const one = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
  };
  const ladder = (LADDERS as readonly string[]).includes(one("ladder")) ? (one("ladder") as Ladder) : "doubles";
  const seasonText = one("season");
  const season = /^\d{1,4}$/.test(seasonText) ? Number(seasonText) : null;
  const tier = (TIER_FILTERS as readonly string[]).includes(one("rank")) ? one("rank") : null;
  return { ladder, season, tier, q: one("q").slice(0, 60) };
}

/** Lower case, without diacritics ("Ștefan" matches "stefan"). */
export const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("ro");

/** The rows of a rank and whose names contain the search, in their order. */
export function filterRows(rows: StandingRow[], tier: string | null, q: string): StandingRow[] {
  const needle = fold(q);
  return rows.filter(
    (row) =>
      (tier === null || row.tier === tier) &&
      (needle === "" || row.players.some((p) => fold(`${p.first_name} ${p.last_name}`).includes(needle))),
  );
}

/** "6–4, 3–6, 10–8" from the team A / team B games of each set. */
export function scoreText(score: Result["score"]): string {
  const sets = Array.isArray(score.sets) ? score.sets : [];
  return sets.map((set) => `${Number(set.a)}–${Number(set.b)}`).join(", ");
}

/** The address of the page with some choices changed (the defaults left out). */
export function queryFor(filters: Filters, change: Partial<Filters> = {}): Record<string, string> {
  const next = { ...filters, ...change };
  const query: Record<string, string> = {};
  if (next.ladder !== "doubles") query.ladder = next.ladder;
  if (next.season !== null) query.season = String(next.season);
  if (next.tier) query.rank = next.tier;
  if (next.q) query.q = next.q;
  return query;
}
