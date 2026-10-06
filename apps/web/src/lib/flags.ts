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

/**
 * What visitors see: the mode, and on the full site the effects (`web_effects`) and the hero video
 * (`web_hero_video`), both off by default (ADR-0023), the children's accounts in the account
 * (`child_accounts`, Q7, off by default) and the club's assistant (`ai`, ADR-0019, off until the
 * owner puts the key on the server and turns it on). Only a flag that is exactly `true` counts.
 */
export type SiteFlags = { mode: SiteMode; effects: boolean; heroVideo: boolean; children: boolean; assistant: boolean };

export function flagsFrom(flags: unknown): SiteFlags {
  const mode = modeFrom(flags);
  const on = (key: string) =>
    mode === "full" && Array.isArray(flags) && (flags as Flag[]).some((f) => f && f.key === key && f.enabled === true);
  return {
    mode,
    effects: on("web_effects"),
    heroVideo: on("web_hero_video"),
    children: on("child_accounts"),
    assistant: on("ai"),
  };
}

export async function siteFlags(fetchImpl: typeof fetch = fetch): Promise<SiteFlags> {
  try {
    const response = await fetchImpl(`${API_URL}/api/v1/config/flags`, { next: { revalidate: 300, tags: [FLAGS_TAG] } });
    return flagsFrom(response.ok ? await response.json() : null);
  } catch {
    return flagsFrom(null);
  }
}

export async function siteMode(fetchImpl: typeof fetch = fetch): Promise<SiteMode> {
  return (await siteFlags(fetchImpl)).mode;
}
