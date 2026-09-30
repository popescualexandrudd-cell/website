/**
 * The Hall of Fame (§9.2.14, LG-134): the winners of every closed league season, read on the server
 * from the public API (`GET /api/v1/league/hall-of-fame`): name, rank tier and place only (R-012).
 * Cached with the league's 5-minute refresh.
 */
import { API_URL, LOCATION_SLUG } from "./site";

export type FameEntry = {
  kind: string;
  tier: string;
  position: number;
  first_name: string;
  last_name: string;
};
export type FameSeason = {
  number: number;
  name: string;
  ends_at: string;
  entries: FameEntry[];
};

/** The seasons, newest first, or null when the API does not answer. */
export async function hallOfFame(fetchImpl: typeof fetch = fetch): Promise<FameSeason[] | null> {
  try {
    const response = await fetchImpl(`${API_URL}/api/v1/league/hall-of-fame?location=${LOCATION_SLUG}`, { next: { revalidate: 300 } });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    return Array.isArray(data) ? (data as FameSeason[]) : null;
  } catch {
    return null;
  }
}
