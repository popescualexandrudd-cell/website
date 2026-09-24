import type { CSSProperties } from "react";
import { srcSet, type ArtSet, type ResolvedImage } from "@/lib/art-shared";

type Props = {
  art: ArtSet | ResolvedImage;
  alt: string;
  sizes?: string;
  mobileSizes?: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  style?: CSSProperties;
  /** Skip the mobile art-direction crop even when one exists. */
  desktopOnly?: boolean;
  /**
   * Load the image only when this media query matches (e.g. the cinematic stage on desktop);
   * otherwise the <img> keeps a transparent pixel and nothing is downloaded.
   */
  gateMedia?: string;
};

const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function isArtSet(value: ArtSet | ResolvedImage): value is ArtSet {
  return "desktop" in value;
}

/**
 * Responsive <picture>: AVIF then WebP, a dedicated 9:16 crop under 768 px when available,
 * and the blurred preview painted as a background until the image arrives.
 */
export function ArtPicture({
  art,
  alt,
  sizes = "100vw",
  mobileSizes = "100vw",
  className,
  imgClassName,
  priority = false,
  style,
  desktopOnly = false,
  gateMedia,
}: Props) {
  const desktop = isArtSet(art) ? art.desktop : art;
  const mobile = isArtSet(art) && !desktopOnly ? art.mobile : null;
  return (
    <>
      {priority ? (
        // React hoists these into <head>, so the LCP image starts downloading before scripts and fonts.
        <>
          {mobile ? (
            <link
              rel="preload"
              as="image"
              type="image/avif"
              imageSrcSet={srcSet(mobile.avif)}
              imageSizes={mobileSizes}
              media="(max-width: 767px)"
              fetchPriority="high"
            />
          ) : null}
          <link
            rel="preload"
            as="image"
            type="image/avif"
            imageSrcSet={srcSet(desktop.avif)}
            imageSizes={sizes}
            media={gateMedia ?? (mobile ? "(min-width: 768px)" : undefined)}
            fetchPriority="high"
          />
        </>
      ) : null}
      <picture className={className}>
        {mobile ? (
          <>
            <source
              media="(max-width: 767px)"
              type="image/avif"
              srcSet={srcSet(mobile.avif)}
              sizes={mobileSizes}
            />
            <source
              media="(max-width: 767px)"
              type="image/webp"
              srcSet={srcSet(mobile.webp)}
              sizes={mobileSizes}
            />
          </>
        ) : null}
        <source media={gateMedia} type="image/avif" srcSet={srcSet(desktop.avif)} sizes={sizes} />
        <source media={gateMedia} type="image/webp" srcSet={srcSet(desktop.webp)} sizes={sizes} />
        <img
          src={gateMedia ? TRANSPARENT_PIXEL : desktop.fallback}
          width={desktop.width}
          height={desktop.height}
          alt={alt}
          className={imgClassName}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          fetchPriority={priority ? "high" : "auto"}
          style={{
            backgroundImage: `url("${desktop.blurDataURL}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            ...style,
          }}
        />
      </picture>
    </>
  );
}
