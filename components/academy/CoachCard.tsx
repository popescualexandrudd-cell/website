import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { CoachView } from "@/lib/content";
import { Picture } from "@/components/ui/Picture";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { TodoText } from "@/components/site/TodoText";

/** "Vlad Moșteanu" → "VM". */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/**
 * A member of the team: portrait (or, until the club uploads one, the coach's initials on a
 * court drawing), name, role, a sentence, specialties.
 */
export async function CoachCard({
  coach,
  headingLevel = "h3",
}: {
  coach: CoachView;
  headingLevel?: "h2" | "h3";
}) {
  const t = await getTranslations();
  const Heading = headingLevel;
  return (
    <article className="coach-card" data-head={coach.isHead || undefined}>
      <Link
        href={{ pathname: "/echipa/[slug]", params: { slug: coach.slug } }}
        className="coach-card-link"
      >
        <span className="coach-card-media">
          {coach.photo ? (
            <Picture
              image={coach.photo}
              alt={coach.photo ? t("team.photoAlt", { name: coach.name }) : ""}
              sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
              imgClassName="coach-card-img"
            />
          ) : (
            <MediaFrame variant="plan" className="coach-card-frame">
              <span className="coach-card-initials" aria-hidden="true">
                {initialsOf(coach.name)}
              </span>
            </MediaFrame>
          )}
        </span>
        <span className="coach-card-role">
          <TodoText value={coach.role} />
        </span>
        <Heading className="coach-card-name">
          <TodoText value={coach.name} />
        </Heading>
      </Link>
      {coach.summary ? (
        <p className="coach-card-summary">
          <TodoText value={coach.summary} />
        </p>
      ) : null}
      {coach.specialties.length > 0 ? (
        <ul className="coach-card-tags" aria-label={t("team.specialties")}>
          {coach.specialties.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
