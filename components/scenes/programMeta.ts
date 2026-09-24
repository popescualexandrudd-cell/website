import type { ProgramView } from "@/lib/content";

type T = (key: string, values?: Record<string, string | number>) => string;

/** "4–7 ani · 45 de minute · grupă" — the facts a parent scans for first. */
export function programMeta(program: ProgramView, t: T): string[] {
  const parts: string[] = [];
  if (program.ageMin !== null && program.ageMax !== null) parts.push(t("common.years", { min: program.ageMin, max: program.ageMax }));
  else if (program.ageMin !== null) parts.push(t("common.yearsFrom", { min: program.ageMin }));
  else if (program.level !== "TOATE") parts.push(t(`programs.level.${program.level}`));
  else parts.push(t("home.ageAll"));
  if (program.durationMin) parts.push(t("common.minutes", { n: program.durationMin }));
  parts.push(t(`programs.format.${program.format}`));
  return parts;
}
