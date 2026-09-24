import type { ResolvedImage } from "./media-shared";

export { srcSet, type ImageSource, type ResolvedImage } from "./media-shared";

type EncodedVariant = { w: number; avif: string; webp: string };

/** The subset of a Media row needed to render it. */
export type MediaLike = {
  width: number;
  height: number;
  blurDataURL: string;
  variants: unknown;
};

/** An image uploaded from the admin (stored under /media), as responsive AVIF + WebP sources. */
export function resolveMedia(media: MediaLike | null | undefined): ResolvedImage | null {
  if (!media) return null;
  const raw = Array.isArray(media.variants) ? media.variants : [];
  const variants = raw
    .filter(
      (v): v is EncodedVariant =>
        typeof v === "object" &&
        v !== null &&
        typeof (v as EncodedVariant).w === "number" &&
        typeof (v as EncodedVariant).webp === "string",
    )
    .sort((a, b) => a.w - b.w);
  if (variants.length === 0) return null;
  const middle = variants[Math.min(variants.length - 1, Math.floor(variants.length / 2))];
  return {
    width: media.width,
    height: media.height,
    blurDataURL: media.blurDataURL,
    avif: variants.map((v) => ({ w: v.w, src: v.avif })),
    webp: variants.map((v) => ({ w: v.w, src: v.webp })),
    fallback: middle?.webp ?? "",
  };
}
