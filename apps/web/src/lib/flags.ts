/**
 * The club's feature flags (ADR-0022), read from the API on the server: which site visitors see.
 * `full_site` off (the default until the launch, Q57): the pre-launch page approved in Stage 1B;
 * on: the full site of Stage 11. Cached under the "flags" tag: the backend asks for a refresh when a
 * flag changes (POST /api/revalidate), and the pages refresh on their own within 5 minutes.
 * Without the API (a build with no backend) the site stays in pre-launch mode: never half a site.
 */
import { API_URL } from "./site";

export type SiteMode = "prelaunch" | "full";
export const FLAGS_TAG = "flags";

type Flag = { key: string; enabled: boolean };

export function modeFrom(flags: unknown): SiteMode {
  if (!Array.isArray(flags)) return "prelaunch";
  const full = (flags as Flag[]).find((f) => f && f.key === "full_site");
  return full?.enabled === true ? "full" : "prelaunch";
}

export async function siteMode(fetchImpl: typeof fetch = fetch): Promise<SiteMode> {
  try {
    const response = await fetchImpl(`${API_URL}/api/v1/config/flags`, { next: { revalidate: 300, tags: [FLAGS_TAG] } });
    return response.ok ? modeFrom(await response.json()) : "prelaunch";
  } catch {
    return "prelaunch";
  }
}
