import type { ProgramView } from "@/lib/content";
import type { BookableProgram } from "./BookingFlow";
import { programMeta } from "@/components/home/programMeta";

type T = (key: string, values?: Record<string, string | number>) => string;

export function toBookable(programs: ProgramView[], t: T): BookableProgram[] {
  return programs
    .filter((p) => p.bookableOnline && p.format !== "EVENIMENT")
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      summary: p.summary,
      format: p.format,
      durationMin: p.durationMin,
      maxParticipants: p.maxParticipants,
      forMinors: p.forMinors,
      meta: programMeta(p, t).join(" · "),
    }));
}
