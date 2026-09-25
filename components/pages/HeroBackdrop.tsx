import { getTranslations } from "next-intl/server";
import type { ResolvedImage } from "@/lib/media-shared";
import { getSettings, localizedSettings } from "@/lib/content";
import { Picture } from "@/components/ui/Picture";
import { AmbientVideo } from "@/components/ui/AmbientVideo";

/**
 * The club's presentation video behind a page header (muted, looped, with a pause button) and a
 * dark shade over it, so the text in front stays readable. Without a video, the given photo or
 * the site's opening photo takes its place; without either, nothing is drawn. The header that
 * holds it needs the `has-backdrop` class.
 */
export async function HeroBackdrop({
  image,
  imageAlt = "",
}: {
  image?: ResolvedImage | null;
  imageAlt?: string;
}) {
  const [row, t] = await Promise.all([getSettings(), getTranslations("home")]);
  const settings = localizedSettings(row, "ro");
  const video = settings.heroVideo;
  const photo = image ?? settings.heroImage;
  if (!video && !photo) return null;
  return (
    <>
      {video ? (
        <AmbientVideo
          video={video}
          label=""
          pauseLabel={t("videoPause")}
          playLabel={t("videoPlay")}
          className="page-hero-backdrop"
        />
      ) : (
        <Picture
          image={photo!}
          alt={image ? imageAlt : ""}
          priority
          sizes="100vw"
          className="page-hero-backdrop"
          imgClassName="page-hero-img"
        />
      )}
      <div className="page-hero-shade" aria-hidden="true" />
    </>
  );
}
