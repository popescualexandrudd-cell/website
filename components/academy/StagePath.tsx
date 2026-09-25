import type { CSSProperties } from "react";
import { getTranslations } from "next-intl/server";
import type { AcademyGroupView } from "@/lib/content";
import { groupAges } from "./format";

/**
 * The development path: mini tennis with the red, orange and green ball, then juniors and
 * seniors with the yellow one, in one symmetric row joined by lines that fade at both ends.
 */
export async function StagePath({ groups }: { groups: AcademyGroupView[] }) {
  const t = await getTranslations();
  if (groups.length === 0) return null;
  const mini = groups.filter((g) => g.stage !== "GALBEN").length;
  const style = { "--stages": groups.length } as CSSProperties;
  return (
    <>
      <div className="stage-bands" aria-hidden="true" style={style}>
        {mini > 0 ? (
          <span className="stage-band" style={{ gridColumn: `1 / span ${mini}` }}>
            {t("programs.minitenis")}
          </span>
        ) : null}
        {mini < groups.length ? (
          <span className="stage-band stage-band--yellow">{t("programs.seniors")}</span>
        ) : null}
      </div>
      <ol className="stages" aria-label={t("home.stagesLabel")} style={style}>
        {groups.map((group) => (
          <li key={group.id} className="stage" data-stage={group.stage ?? undefined}>
            <span className="stage-ball" aria-hidden="true" />
            <span className="stage-ages numerals">{groupAges(group, t)}</span>
            <h3 className="stage-name">{group.name}</h3>
            <p className="stage-summary">{group.summary}</p>
          </li>
        ))}
      </ol>
    </>
  );
}
