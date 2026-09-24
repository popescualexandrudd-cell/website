import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { LessonTypeView, SceneView } from "@/lib/content";
import { TodoText } from "@/components/site/TodoText";
import { durationsText, peopleText } from "@/components/pages/LessonTypeList";
import { SectionHead } from "./SectionHead";
import { safeHref } from "./links";

/**
 * How you can train: the kinds of lesson (individual, for two, for three, group, biomechanical
 * analysis), read from the database so the home page follows what the coach edits in the admin.
 */
export async function LessonsSection({
  scene,
  lessons,
}: {
  scene: SceneView;
  lessons: LessonTypeView[];
}) {
  const t = await getTranslations();
  const href = safeHref(scene.ctaHref) ?? "/programe";
  return (
    <section className="pathway tone-dark" id={scene.key} aria-labelledby={`${scene.key}-title`}>
      <div className="pathway-inner">
        <SectionHead id={`${scene.key}-title`} kicker={scene.indexName} title={scene.title}>
          {scene.body ? (
            <p className="lessons-intro">
              <TodoText value={scene.body} />
            </p>
          ) : null}
        </SectionHead>
        <ol className="pathway-steps" aria-label={t("home.lessonsLabel")}>
          {lessons.map((lesson, i) => (
            <li key={lesson.id} className="pathway-step">
              <span className="pathway-marker" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="pathway-title">{lesson.name}</h3>
              <p className="lessons-meta">
                {peopleText(lesson, t)} · {durationsText(lesson.durations, t)}
              </p>
              <p>
                <TodoText value={lesson.summary} />
              </p>
              {lesson.bookableOnline ? (
                <p>
                  <Link
                    href={{ pathname: "/rezervare", query: { tip: lesson.slug } }}
                    className="link-quiet"
                  >
                    {t("common.book")}
                  </Link>
                </p>
              ) : null}
            </li>
          ))}
        </ol>
        {scene.ctaLabel ? (
          <p className="mt-10">
            <Link href={href} className="link-quiet">
              {scene.ctaLabel}
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
