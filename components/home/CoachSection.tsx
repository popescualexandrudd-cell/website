import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { SceneView } from "@/lib/content";
import type { ResolvedImage } from "@/lib/media-shared";
import { Markdown } from "@/components/site/Markdown";
import { TodoText } from "@/components/site/TodoText";
import { SectionHead } from "./SectionHead";
import { CoachPortrait } from "./CoachPortrait";
import { safeHref } from "./links";

type Coach = {
  name: string;
  photo: ResolvedImage | null;
  photoAlt: string;
  certifications: { id: string; title: string; issuer: string; year: number | null }[];
};

/** The personal section: the photo on court, a short presentation and the qualifications. */
export async function CoachSection({ scene, coach }: { scene: SceneView; coach: Coach }) {
  const t = await getTranslations("home");
  const href = safeHref(scene.ctaHref) ?? "/despre";
  return (
    <section className="coach tone-sand" id={scene.key} aria-labelledby={`${scene.key}-title`}>
      <div className="coach-inner">
        <CoachPortrait
          photo={coach.photo}
          alt={coach.photoAlt || t("coachPhotoAlt", { name: coach.name })}
          note={scene.extra.photoNote ?? ""}
        />
        <div className="coach-copy">
          <SectionHead id={`${scene.key}-title`} kicker={scene.indexName} title={scene.title} />
          {scene.body ? <Markdown source={scene.body} className="prose-ed coach-body" /> : null}
          {coach.certifications.length > 0 ? (
            <div className="coach-credentials">
              <h3 className="coach-credentials-title">
                {scene.extra.credentialsTitle || t("credentials")}
              </h3>
              <ul>
                {coach.certifications.map((c) => (
                  <li key={c.id}>
                    <span className="coach-credential-title">
                      <TodoText value={c.title} />
                    </span>
                    <span className="coach-credential-issuer">
                      <TodoText value={c.issuer} />
                      {c.year ? `, ${c.year}` : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {scene.ctaLabel ? (
            <p className="mt-8">
              <Link href={href} className="btn btn-primary btn-arrow">
                {scene.ctaLabel}
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
