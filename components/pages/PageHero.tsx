import type { ReactNode } from "react";
import type { ResolvedImage } from "@/lib/media-shared";
import { Picture } from "@/components/ui/Picture";
import { CourtMark } from "@/components/ui/CourtMark";
import { TodoText } from "@/components/site/TodoText";
import { Words } from "@/components/site/Words";

type Props = {
  title: string;
  intro?: string;
  image: ResolvedImage | null;
  imageAlt?: string;
  children?: ReactNode;
  eyebrow?: ReactNode;
};

/**
 * Interior page header: a dark clay-brick band with the title in condensed capitals, the
 * introduction, and either the page's photo (uploaded from the admin) or a court drawn in lines.
 */
export function PageHero({ title, intro, image, imageAlt = "", children, eyebrow }: Props) {
  return (
    <header className="page-hero tone-dark">
      <div className="page-hero-inner">
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
        {image ? (
          <figure className="page-hero-figure">
            <Picture
              image={image}
              alt={imageAlt}
              priority
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="page-hero-picture"
              imgClassName="page-hero-img"
            />
          </figure>
        ) : (
          <CourtMark className="page-hero-court" />
        )}
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
