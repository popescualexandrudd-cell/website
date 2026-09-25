import type { ResolvedImage, ResolvedVideo, VideoSource } from "./media-shared";

export {
  srcSet,
  videoSourcesFor,
  type ImageSource,
  type ResolvedImage,
  type ResolvedVideo,
} from "./media-shared";

type EncodedVariant = { w: number; avif: string; webp: string };

/** The subset of a Media row needed to render it. */
export type MediaLike = {
  width: number;
  height: number;
  blurDataURL: string;
  variants: unknown;
  kind?: "IMAGINE" | "VIDEO";
  status?: "GATA" | "IN_PROCESARE" | "EROARE";
  poster?: unknown;
  durationSec?: number | null;
};

/** An image uploaded from the admin (stored under /media), as responsive AVIF + WebP sources. */
export function resolveMedia(media: MediaLike | null | undefined): ResolvedImage | null {
  if (!media) return null;
  // A video stands in as an image by its poster frame (e.g. a video picked for a photo slot).
  if (media.kind === "VIDEO") return videoPoster(media);
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

function videoPoster(media: MediaLike): ResolvedImage | null {
  return resolveMedia({
    width: media.width,
    height: media.height,
    blurDataURL: media.blurDataURL,
    variants: media.poster,
  });
}

/** An uploaded video once converted: its MP4 encodings and its poster frame. */
export function resolveVideo(media: MediaLike | null | undefined): ResolvedVideo | null {
  if (!media || media.kind !== "VIDEO" || media.status !== "GATA") return null;
  const raw = Array.isArray(media.variants) ? media.variants : [];
  const sources = raw
    .filter(
      (v): v is VideoSource =>
        typeof v === "object" &&
        v !== null &&
        typeof (v as VideoSource).w === "number" &&
        typeof (v as VideoSource).h === "number" &&
        typeof (v as VideoSource).src === "string",
    )
    .sort((a, b) => a.w - b.w);
  if (sources.length === 0) return null;
  return {
    width: media.width,
    height: media.height,
    sources,
    poster: videoPoster(media),
    durationSec: media.durationSec ?? null,
  };
}
