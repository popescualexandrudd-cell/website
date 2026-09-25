import type { CSSProperties } from "react";
import { getTranslations } from "next-intl/server";
import type { ProgramView, SceneView } from "@/lib/content";
import { Link } from "@/i18n/navigation";
import { Picture } from "@/components/ui/Picture";
import { CourtMark } from "@/components/ui/CourtMark";
import { TodoText } from "@/components/site/TodoText";
import { SectionHead } from "./SectionHead";
import { programMeta } from "./programMeta";
import { safeHref } from "./links";

/**
 * The programmes as a grid of cards (photo, name, who it is for, one sentence), each leading to
 * the programme's page.
 */
export async function ProgramsSection({
  scene,
  programs,
}: {
  scene: SceneView;
  programs: ProgramView[];
}) {
  const t = await getTranslations();
  const href = safeHref(scene.ctaHref) ?? "/programe";
  return (
    <section className="programs" id={scene.key} aria-labelledby={`${scene.key}-title`}>
      <div className="programs-inner">
        <div className="programs-head">
          <SectionHead id={`${scene.key}-title`} kicker={scene.indexName} title={scene.title}>
            {scene.body ? (
              <p className="section-lead">
                <TodoText value={scene.body} />
              </p>
            ) : null}
          </SectionHead>
          {scene.ctaLabel ? (
            <Link href={href} className="link-quiet">
              {scene.ctaLabel}
            </Link>
          ) : null}
        </div>
        <ol className="program-stack">
          {programs.map((program, i) => (
            <li key={program.id} className="program-slab" style={{ "--i": i } as CSSProperties}>
              <Link
                href={{ pathname: "/programe/[slug]", params: { slug: program.slug } }}
                className="program-slab-link"
              >
                <span className="program-slab-media">
                  {program.image ? (
                    <Picture
                      image={program.image}
                      alt=""
                      sizes="(min-width: 1100px) 30vw, (min-width: 700px) 46vw, 92vw"
                      imgClassName="program-slab-img"
                    />
                  ) : (
                    <CourtMark variant="plan" className="program-slab-court" />
                  )}
                </span>
                <span className="program-slab-body">
                  <span className="program-slab-number numerals">
                    {t("home.programNumber", { n: String(i + 1).padStart(2, "0") })}
                  </span>
                  <span className="program-slab-name">{program.name}</span>
                  <span className="program-slab-meta">{programMeta(program, t).join(" · ")}</span>
                  <span className="program-slab-summary">
                    <TodoText value={program.summary} />
                  </span>
                  <span className="program-slab-more" aria-hidden="true">
                    {t("home.viewProgram")}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
