import { srcSet, type ResolvedImage } from "@/lib/media-shared";
import { Monogram } from "./Monogram";

type Props = { logo: ResolvedImage | null; monogram: string };

/**
 * The club's logo as uploaded in the admin, at the height of the header; the monogram until
 * there is one. The logo is decorative next to the club's name, so it carries no text.
 */
export function BrandMark({ logo, monogram }: Props) {
  if (!logo)
    return <Monogram letters={monogram} className="brand-mark size-10 shrink-0 md:size-11" />;
  const ratio = logo.width / logo.height;
  return (
    <picture className="brand-mark brand-logo" style={{ aspectRatio: String(ratio) }}>
      <source type="image/avif" srcSet={srcSet(logo.avif)} sizes={`${Math.round(48 * ratio)}px`} />
      <source type="image/webp" srcSet={srcSet(logo.webp)} sizes={`${Math.round(48 * ratio)}px`} />
      {/* eslint-disable-next-line @next/next/no-img-element -- responsive AVIF/WebP from the admin */}
      <img src={logo.fallback} alt="" width={logo.width} height={logo.height} />
    </picture>
  );
}
