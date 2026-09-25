import type { AcademyGroupView } from "@/lib/content";

type T = (key: string, values?: Record<string, string | number>) => string;

/** "4–7 ani", "de la 11 ani", or nothing when no age is set. */
export function groupAges(group: Pick<AcademyGroupView, "ageMin" | "ageMax">, t: T): string {
  if (group.ageMin !== null && group.ageMax !== null && group.ageMax !== group.ageMin)
    return t("common.years", { min: group.ageMin, max: group.ageMax });
  if (group.ageMin !== null) return t("common.yearsFrom", { min: group.ageMin });
  return "";
}
