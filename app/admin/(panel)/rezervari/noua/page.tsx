import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { localDateKey } from "@/lib/availability";
import { t } from "@/lib/i18n-content";
import { isChildrenProgram } from "@/lib/programs";
import { ManualBookingForm } from "@/components/admin/ManualBookingForm";

export const metadata: Metadata = { title: "Rezervare nouă" };
const DAYS = ["", "luni", "marți", "miercuri", "joi", "vineri", "sâmbătă", "duminică"];

export default async function NewBookingPage() {
  await requireAdmin("PROPRIETAR");
  const [programs, schedules, settings] = await Promise.all([
    db.program.findMany({ where: { format: { not: "EVENIMENT" } }, orderBy: { order: "asc" } }),
    db.groupSchedule.findMany({
      where: { active: true },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    }),
    db.siteSettings.findUniqueOrThrow({ where: { id: 1 }, select: { timezone: true } }),
  ]);
  return (
    <>
      <p className="mb-2 text-note">
        <Link href="/admin/rezervari" className="link">
          Toate rezervările
        </Link>
      </p>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-title">Rezervare nouă</h1>
          <p>
            Pentru rezervările primite la telefon sau pe WhatsApp. Suprapunerile sunt verificate
            automat.
          </p>
        </div>
      </div>
      <ManualBookingForm
        today={localDateKey(new Date(), settings.timezone)}
        programs={programs.map((p) => ({
          id: p.id,
          name: t(p.name, "ro"),
          format: p.format,
          forMinors: isChildrenProgram(p),
          maxParticipants: p.maxParticipants,
        }))}
        schedules={schedules.map((s) => ({
          id: s.id,
          programId: s.programId,
          label: `${DAYS[s.weekday]} ${s.startTime} (${s.durationMin} min)`,
        }))}
      />
    </>
  );
}
