import type { ReactNode } from "react";
import type { ArtSet } from "@/lib/art";
import { ArtPicture } from "@/components/ui/ArtPicture";
import { TodoText } from "@/components/site/TodoText";

type Props = { title: string; intro?: string; art: ArtSet | null; imageAlt?: string; children?: ReactNode; eyebrow?: ReactNode };

/** Interior page header: one painting, then the title and a short introduction. */
export function PageHero({ title, intro, art, imageAlt = "", children, eyebrow }: Props) {
  return (
    <header className="page-hero">
      {art ? (
        <figure className="page-hero-figure">
          <ArtPicture art={art} alt={imageAlt} priority desktopOnly className="page-hero-picture" imgClassName="page-hero-img" />
        </figure>
      ) : null}
      <div className="grid-page page-hero-text">
        <div className="page-hero-copy">
          {eyebrow}
          <h1 className="page-title">
            <TodoText value={title} />
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

export function PageSection({ title, id, children, className = "" }: { title?: string; id?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`grid-page page-section ${className}`} aria-labelledby={title && id ? `${id}-title` : undefined} id={id}>
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
