import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ProgramView, SceneView } from "@/lib/content";
import { formatPrice } from "@/lib/format";
import { ArtPicture } from "@/components/ui/ArtPicture";
import { TodoText } from "@/components/site/TodoText";
import { SceneFrame } from "./SceneFrame";
import { SceneTitle } from "./SceneTitle";
import { programMeta } from "./programMeta";
import { safeHref } from "./links";

/**
 * Scene 5 · programmes: a horizontal gallery of small paintings. In the cinematic layout the
 * section stays pinned while vertical scrolling moves the band sideways; elsewhere it is a list.
 */
export async function ProgramsScene({ scene, index, programs, locale }: { scene: SceneView; index: number; programs: ProgramView[]; locale: string }) {
  const t = await getTranslations();
  const allHref = safeHref(scene.ctaHref) ?? "/programe";
  return (
    <SceneFrame scene={scene} index={index} layout="flow" showStaticImage={false}>
      <div className="programs-head">
        <SceneTitle id={`${scene.key}-title`} text={scene.title} />
        {scene.ctaLabel ? (
          <Link href={allHref} className="link-quiet programs-all">
            {scene.ctaLabel}
          </Link>
        ) : null}
      </div>
      <div className="programs-viewport">
        <ul className="programs-track" aria-label={t("home.programsTrackLabel")}>
          {programs.map((program) => (
            <li key={program.id} className="program-item">
              <Link href={{ pathname: "/programe/[slug]", params: { slug: program.slug } }} className="program-item-link">
                <span className="program-item-frame">
                  {program.art ? (
                    <ArtPicture
                      art={program.art}
                      alt=""
                      desktopOnly
                      sizes="(min-width: 768px) 22vw, 36vw"
                      className="program-item-picture"
                      imgClassName="program-item-img"
                    />
                  ) : null}
                  <span className="program-item-anchor" data-ball-anchor aria-hidden="true" />
                </span>
                <span className="program-item-name">{program.name}</span>
                <span className="program-item-meta">{programMeta(program, t).join(" · ")}</span>
                <span className="program-item-price numerals">
                  {program.priceFrom ? (
                    <>
                      {t("common.from")} <TodoText value={formatPrice(program.priceFrom.price, program.priceFrom.currency, locale)} />
                    </>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </SceneFrame>
  );
}
