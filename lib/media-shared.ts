/** Image types and helpers that are safe in client components (no file system access). */

export type ImageSource = { w: number; src: string };
export type ResolvedImage = {
  width: number;
  height: number;
  blurDataURL: string;
  avif: ImageSource[];
  webp: ImageSource[];
  fallback: string;
};

export function srcSet(sources: ImageSource[]): string {
  return sources.map((s) => `${s.src} ${s.w}w`).join(", ");
}

/** One encoding of an uploaded video (H.264 MP4), by its frame size. */
export type VideoSource = { w: number; h: number; src: string };
export type ResolvedVideo = {
  width: number;
  height: number;
  /** Smallest first; the player picks by screen width. */
  sources: VideoSource[];
  /** A frame of the video, shown until it plays (and instead of it when motion is reduced). */
  poster: ResolvedImage | null;
  durationSec: number | null;
};

/** The larger source for wide screens, the smaller one for phones. */
export function videoSourcesFor(video: ResolvedVideo): { small: VideoSource; large: VideoSource } {
  const sorted = [...video.sources].sort((a, b) => a.w - b.w);
  const small = sorted[0]!;
  return { small, large: sorted.at(-1) ?? small };
}
