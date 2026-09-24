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
