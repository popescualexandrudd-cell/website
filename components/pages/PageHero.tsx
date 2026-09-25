import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import type { ResolvedImage } from "@/lib/media-shared";
import { getSettings, localizedSettings } from "@/lib/content";
import { Picture } from "@/components/ui/Picture";
import { AmbientVideo } from "@/components/ui/AmbientVideo";
import { TodoText } from "@/components/site/TodoText";
import { Words } from "@/components/site/Words";

type Props = {
  title: string;
  intro?: string;
  /** The page's own photo, used behind the text when the club has no presentation video. */
  image?: ResolvedImage | null;
  imageAlt?: string;
  children?: ReactNode;
  eyebrow?: ReactNode;
};

/**
 * Interior page header: the club's presentation video running behind the page (muted, looped,
 * with a pause button), a dark shade over it, and the title and introduction in front. Without a
 * video, the page's photo takes its place; without either, the dark band alone.
 */
export async function PageHero({ title, intro, image, imageAlt = "", children, eyebrow }: Props) {
  const [row, t] = await Promise.all([getSettings(), getTranslations("home")]);
  const settings = localizedSettings(row, "ro");
  const video = settings.heroVideo;
  const backdrop = video ?? image ?? settings.heroImage;
  return (
    <header className={`page-hero tone-dark${backdrop ? "page-hero--media" : ""}`}>
      {video ? (
        <AmbientVideo
          video={video}
          label=""
          pauseLabel={t("videoPause")}
          playLabel={t("videoPlay")}
          className="page-hero-backdrop"
        />
      ) : image || settings.heroImage ? (
        <Picture
          image={(image ?? settings.heroImage)!}
          alt={image ? imageAlt : ""}
          priority
          sizes="100vw"
          className="page-hero-backdrop"
          imgClassName="page-hero-img"
        />
      ) : null}
      {backdrop ? <div className="page-hero-shade" aria-hidden="true" /> : null}
      <div className="page-hero-inner page-hero-inner--single">
        <div className="page-hero-copy">
          {eyebrow}
          <h1 className="page-title">
            <Words text={title} />
          </h1>
          {intro ? (
            <p className="page-intro">
              <TodoText value={intro} />
            </p>
          ) : null}
          {children}
        </div>
      </div>
    </header>
  );
}

export function PageSection({
  title,
  id,
  children,
  className = "",
}: {
  title?: string;
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`grid-page page-section ${className}`}
      aria-labelledby={title && id ? `${id}-title` : undefined}
      id={id}
    >
      <div className="page-section-inner">
        {title ? (
          <h2 id={id ? `${id}-title` : undefined} className="section-title">
            {title}
          </h2>
        ) : null}
        {children}
      </div>
    </section>
  );
}
