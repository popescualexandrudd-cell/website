import manifestJson from "@/public/art/manifest.json";

export type ImageSource = { w: number; src: string };
export type ResolvedImage = {
  width: number;
  height: number;
  blurDataURL: string;
  avif: ImageSource[];
  webp: ImageSource[];
  fallback: string;
};
export type ArtSet = { desktop: ResolvedImage; mobile: ResolvedImage | null };

type EncodedVariant = { w: number; avif: string; webp: string };
type Encoded = { width: number; height: number; blurDataURL: string; variants: EncodedVariant[] };
type ManifestEntry = { kind: string; source: string; desktop: Encoded; mobile?: Encoded };

function isEncoded(value: unknown): value is Encoded {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.width === "number" && typeof v.height === "number" && Array.isArray(v.variants);
}

const manifest: Record<string, ManifestEntry> = (() => {
  const images = (manifestJson as { images?: Record<string, unknown> }).images ?? {};
  const out: Record<string, ManifestEntry> = {};
  for (const [key, entry] of Object.entries(images)) {
    const e = entry as Record<string, unknown>;
    if (!isEncoded(e.desktop)) continue;
    out[key] = {
      kind: String(e.kind ?? "scene"),
      source: String(e.source ?? "placeholder"),
      desktop: e.desktop,
      mobile: isEncoded(e.mobile) ? e.mobile : undefined,
    };
  }
  return out;
})();

function toResolved(encoded: Encoded): ResolvedImage {
  const variants = [...encoded.variants].sort((a, b) => a.w - b.w);
  const middle = variants[Math.min(variants.length - 1, Math.floor(variants.length / 2))];
  return {
    width: encoded.width,
    height: encoded.height,
    blurDataURL: encoded.blurDataURL,
    avif: variants.map((v) => ({ w: v.w, src: v.avif })),
    webp: variants.map((v) => ({ w: v.w, src: v.webp })),
    fallback: middle?.webp ?? "",
  };
}

/** Artwork processed by `npm run images` (real painting or placeholder), by key. */
export function resolveArt(key: string | null | undefined): ArtSet | null {
  if (!key) return null;
  const entry = manifest[key];
  if (!entry) return null;
  return { desktop: toResolved(entry.desktop), mobile: entry.mobile ? toResolved(entry.mobile) : null };
}

export function isPlaceholderArt(key: string): boolean {
  return manifest[key]?.source === "placeholder";
}

/** The subset of a Media row needed to render it. */
export type MediaLike = {
  width: number;
  height: number;
  blurDataURL: string;
  variants: unknown;
};

/** An image uploaded from the admin (stored under /media). */
export function resolveMedia(media: MediaLike | null | undefined): ResolvedImage | null {
  if (!media) return null;
  const raw = Array.isArray(media.variants) ? media.variants : [];
  const variants = raw.filter(
    (v): v is EncodedVariant =>
      typeof v === "object" && v !== null && typeof (v as EncodedVariant).w === "number" && typeof (v as EncodedVariant).webp === "string",
  );
  if (variants.length === 0) return null;
  return toResolved({ width: media.width, height: media.height, blurDataURL: media.blurDataURL, variants });
}

/** An uploaded image wins over the artwork key; the mobile crop falls back to the desktop one. */
export function pickArt(options: {
  media?: MediaLike | null;
  mobileMedia?: MediaLike | null;
  artKey?: string | null;
}): ArtSet | null {
  const art = resolveArt(options.artKey);
  const desktop = resolveMedia(options.media) ?? art?.desktop ?? null;
  if (!desktop) return null;
  const mobile = resolveMedia(options.mobileMedia) ?? (options.media ? null : (art?.mobile ?? null));
  return { desktop, mobile };
}

export function srcSet(sources: ImageSource[]): string {
  return sources.map((s) => `${s.src} ${s.w}w`).join(", ");
}
