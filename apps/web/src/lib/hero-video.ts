/**
 * The hero video's files (ADR-0023, Phase 2), as `pnpm --filter @jungle/web video:hero` wrote them:
 * public/media/hero/manifest.json. Read on the server; no manifest, or one that is not exactly what
 * the script writes, means no video (the hero stays as it is). `HERO_VIDEO_MANIFEST` points the
 * end-to-end tests at a generated test clip (public/media/hero-e2e, never committed).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type HeroVideoManifest = {
  poster: string;
  illustrative: boolean;
  desktop: { mp4: string; webm: string };
  mobile: { mp4: string; webm: string };
};

const PATH = /^\/media\/hero(-e2e)?\/[a-z0-9-]+\.(mp4|webm|jpg)$/;

/** Only a manifest with the expected shape and file paths under /media/hero/ is used. */
export function manifestFrom(value: unknown): HeroVideoManifest | null {
  if (typeof value !== "object" || value === null) return null;
  const m = value as Record<string, unknown>;
  const pair = (v: unknown) => {
    const p = v as Record<string, unknown> | null;
    return p && typeof p.mp4 === "string" && typeof p.webm === "string" && PATH.test(p.mp4) && PATH.test(p.webm) ? { mp4: p.mp4, webm: p.webm } : null;
  };
  const desktop = pair(m.desktop);
  const mobile = pair(m.mobile);
  if (!desktop || !mobile || typeof m.poster !== "string" || !PATH.test(m.poster)) return null;
  return { poster: m.poster, illustrative: m.illustrative === true, desktop, mobile };
}

export function heroVideo(file = process.env.HERO_VIDEO_MANIFEST ?? join(process.cwd(), "public/media/hero/manifest.json")): HeroVideoManifest | null {
  try {
    return manifestFrom(JSON.parse(readFileSync(file, "utf8")));
  } catch {
    return null;
  }
}
