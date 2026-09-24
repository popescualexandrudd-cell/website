import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { SceneView } from "@/lib/content";
import { TodoText } from "@/components/site/TodoText";
import { Court3D } from "@/components/court3d/Court3D";
import { CourtPoster } from "@/components/court3d/CourtPoster";
import { safeHref } from "./links";

/**
 * The opening: a live 3D match on clay behind the headline, the two main actions and four
 * short facts about the coach.
 */
export async function HeroSection({ scene }: { scene: SceneView }) {
  const t = await getTranslations("home");
  const primary = safeHref(scene.ctaHref) ?? "/rezervare";
  const stats = [1, 2, 3, 4]
    .map((n) => ({
      value: scene.extra[`stat${n}Value`] ?? "",
      label: scene.extra[`stat${n}Label`] ?? "",
    }))
    .filter((s) => s.value.trim() !== "");
  return (
    <section
      className="hero tone-dark"
      id={scene.key}
      data-scene
      aria-labelledby={`${scene.key}-title`}
    >
      <Court3D
        mode="rally"
        className="hero-stage"
        label={scene.extra.sceneLabel ?? ""}
        poster={<CourtPoster variant="match" />}
      />
      <div className="hero-shade" aria-hidden="true" />
      <div className="hero-inner">
        <p className="kicker">
          <TodoText value={scene.indexName} />
        </p>
        <h1 id={`${scene.key}-title`} className="hero-title">
          <TodoText value={scene.title} />
        </h1>
        {scene.body ? (
          <p className="hero-lead">
            <TodoText value={scene.body} />
          </p>
        ) : null}
        <div className="hero-actions">
          {scene.ctaLabel ? (
            <Link href={primary} className="btn btn-primary btn-arrow">
              {scene.ctaLabel}
            </Link>
          ) : null}
          {scene.extra.secondaryLabel ? (
            <Link href="/programe" className="btn btn-secondary">
              {scene.extra.secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
      {stats.length > 0 ? (
        <dl className="hero-stats" aria-label={t("statsLabel")}>
          {stats.map((s) => (
            <div key={s.value} className="hero-stat">
              <dt className="hero-stat-value">
                <TodoText value={s.value} />
              </dt>
              <dd className="hero-stat-label">
                <TodoText value={s.label} />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
