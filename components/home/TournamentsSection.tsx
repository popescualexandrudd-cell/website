import { getTranslations } from "next-intl/server";
import type { SceneView, TournamentView } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { TodoText } from "@/components/site/TodoText";
import { Marquee } from "@/components/ui/Marquee";
import { SectionHead } from "./SectionHead";
import { SceneLink } from "./SceneLink";
import { Link } from "@/i18n/navigation";

/**
 * Tournaments at the club: the names run across the band, the next edition (if announced) is
 * called out, and the button leads to the tournaments page.
 */
export async function TournamentsSection({
  scene,
  upcoming,
  hosted,
  locale,
}: {
  scene: SceneView;
  upcoming: TournamentView[];
  hosted: TournamentView[];
  locale: string;
}) {
  const t = await getTranslations("tournaments");
  const names = [...new Set([...upcoming, ...hosted].map((x) => x.name))];
  const next = upcoming[0];
  return (
    <section
      className="tournaments-band tone-dark"
      id={scene.key}
      aria-labelledby={`${scene.key}-title`}
    >
      <div className="tournaments-band-inner">
        <SectionHead id={`${scene.key}-title`} kicker={scene.indexName} title={scene.title}>
          {scene.body ? (
            <p className="section-lead">
              <TodoText value={scene.body} />
            </p>
          ) : null}
        </SectionHead>
        {next?.startsOn ? (
          <p className="tournaments-next">
            <span className="kicker">{t("upcomingTitle")}</span>
            <strong>{next.name}</strong>
            <span className="numerals">
              {formatDate(next.startsOn, "UTC", locale, "d MMMM yyyy")}
            </span>
          </p>
        ) : null}
        <div className="tournaments-band-actions">
          <SceneLink scene={scene} />
          <Link href="/palmares" className="btn btn-secondary">
            {t("honoursLink")}
          </Link>
        </div>
      </div>
      {names.length > 0 ? <Marquee items={names} label={t("hostedTitle")} /> : null}
    </section>
  );
}
