import type { Audience } from "./generated/prisma/client";

/** Programmes for children and juniors: the parent is the contact person (data minimisation). */
export function isChildrenProgram(p: { audience: Audience; ageMax: number | null }): boolean {
  return p.audience === "COPII" || p.audience === "JUNIORI" || (p.ageMax !== null && p.ageMax < 18);
}
