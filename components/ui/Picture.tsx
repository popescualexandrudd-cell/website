import type { CSSProperties } from "react";
import { srcSet, type ResolvedImage } from "@/lib/media-shared";

type Props = {
  image: ResolvedImage;
  alt: string;
  sizes?: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  style?: CSSProperties;
};

/**
 * Responsive <picture> for uploaded images: AVIF then WebP, and the blurred preview painted as
 * a background until the file arrives.
 */
export function Picture({
  image,
  alt,
  sizes = "100vw",
  className,
  imgClassName,
  priority = false,
  style,
}: Props) {
  return (
    <>
      {priority ? (
        // React hoists this into <head>, so the image starts downloading before scripts.
        <link
          rel="preload"
          as="image"
          type="image/avif"
          imageSrcSet={srcSet(image.avif)}
          imageSizes={sizes}
          fetchPriority="high"
        />
      ) : null}
      <picture className={className}>
        <source type="image/avif" srcSet={srcSet(image.avif)} sizes={sizes} />
        <source type="image/webp" srcSet={srcSet(image.webp)} sizes={sizes} />
        <img
          src={image.fallback}
          width={image.width}
          height={image.height}
          alt={alt}
          className={imgClassName}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          fetchPriority={priority ? "high" : "auto"}
          style={{
            backgroundImage: `url("${image.blurDataURL}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            ...style,
          }}
        />
      </picture>
    </>
  );
}
