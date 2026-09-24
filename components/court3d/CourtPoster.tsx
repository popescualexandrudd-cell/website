type Props = { variant: "match" | "lab"; className?: string };

/**
 * The still shown before the 3D scene has loaded, and instead of it where WebGL is not
 * available: a frame rendered from the same scene (the club's court at sunrise, the players,
 * the lab's player at impact), so the page looks the same with or without 3D.
 */
export function CourtPoster({ variant, className }: Props) {
  if (variant === "lab") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a pre-sized WebP still, served as is
      <img
        src="/3d/afis-laborator-v1.webp"
        width={794}
        height={775}
        alt=""
        loading="lazy"
        decoding="async"
        className={`court3d-poster-img ${className ?? ""}`}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP stills with a srcset
    <img
      src="/3d/afis-meci-v1.webp"
      srcSet="/3d/afis-meci-800-v1.webp 800w, /3d/afis-meci-v1.webp 1600w"
      sizes="100vw"
      width={1600}
      height={900}
      alt=""
      decoding="async"
      fetchPriority="high"
      className={`court3d-poster-img ${className ?? ""}`}
    />
  );
}
