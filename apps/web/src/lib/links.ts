/**
 * Links to the owners' other sites (Q20: the tennis club's site stays separate, linked both ways),
 * read from the API on the server (`GET /api/v1/config/links`, the owner sets them in the panel,
 * Q58). Cached under the "config" tag: the backend asks for a refresh when a setting changes.
 */
import { API_URL } from "./site";

export const CONFIG_TAG = "config";

/** Only an https address is ever linked; anything else (or no answer) is no link. */
export function httpsOrNull(value: unknown): string | null {
  return typeof value === "string" && /^https:\/\/[^\s"'<>]+$/.test(value) ? value : null;
}

export async function tennisClubUrl(fetchImpl: typeof fetch = fetch): Promise<string | null> {
  try {
    const response = await fetchImpl(`${API_URL}/api/v1/config/links`, { next: { revalidate: 300, tags: [CONFIG_TAG] } });
    if (!response.ok) return null;
    return httpsOrNull(((await response.json()) as { tennis_club_url?: unknown }).tennis_club_url);
  } catch {
    return null;
  }
}
