import type { LessonTypeView, ProgramView } from "@/lib/content";
import type { BookableLesson, BookableProgram } from "./BookingFlow";
import { programMeta } from "@/components/home/programMeta";

type T = (key: string, values?: Record<string, string | number>) => string;

export function toBookablePrograms(programs: ProgramView[], t: T): BookableProgram[] {
  return programs
    .filter((p) => p.bookableOnline)
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      summary: p.summary,
      meta: programMeta(p, t).join(" · "),
    }));
}

export function toBookableLessons(lessons: LessonTypeView[]): BookableLesson[] {
  return lessons
    .filter((l) => l.bookableOnline && l.durations.length > 0)
    .map((l) => ({
      id: l.id,
      slug: l.slug,
      name: l.name,
      summary: l.summary,
      minParticipants: l.minParticipants,
      maxParticipants: l.maxParticipants,
      durations: l.durations,
      hourlyRate: l.hourlyRate,
      perPerson: l.priceUnit === "PERSOANA",
    }));
}
