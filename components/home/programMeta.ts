import type { ProgramView } from "@/lib/content";

type T = (key: string, values?: Record<string, string | number>) => string;

/** "4–12 ani · începători": who a programme is for, the facts a parent scans for first. */
export function programMeta(program: ProgramView, t: T): string[] {
  const parts: string[] = [];
  if (program.ageMin !== null && program.ageMax !== null)
    parts.push(t("common.years", { min: program.ageMin, max: program.ageMax }));
  else if (program.ageMin !== null) parts.push(t("common.yearsFrom", { min: program.ageMin }));
  else parts.push(t(`programs.groups.${program.audience}`));
  parts.push(t(`programs.level.${program.level}`));
  return parts;
}
