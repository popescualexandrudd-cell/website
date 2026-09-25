import { getTranslations } from "next-intl/server";
import type { SceneView } from "@/lib/content";
import { TodoText } from "@/components/site/TodoText";

export type Figure = { value: number; suffix?: string; label: string };

/**
 * The club in four numbers, each counted from the content itself (courts, programmes, ages,
 * coaches), so they change when the admin does. They count up once they come into view.
 */
export async function FiguresSection({ scene, figures }: { scene: SceneView; figures: Figure[] }) {
  const t = await getTranslations("home");
  if (figures.length === 0) return null;
  return (
    <section className="figures" id={scene.key} aria-labelledby={`${scene.key}-title`}>
      <div className="figures-inner">
        <h2 id={`${scene.key}-title`} className="figures-title">
          <TodoText value={scene.title} />
        </h2>
        <dl className="figures-list" aria-label={t("statsLabel")}>
          {figures.map((figure) => (
            <div key={figure.label} className="figure">
              <dt className="figure-label">{figure.label}</dt>
              <dd className="figure-value numerals" data-countup={figure.value}>
                {figure.value}
                {figure.suffix ?? ""}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
