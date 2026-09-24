import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { localDateKey } from "@/lib/availability";
import { t } from "@/lib/i18n-content";
import { ManualBookingForm } from "@/components/admin/ManualBookingForm";

export const metadata: Metadata = { title: "Rezervare nouă" };

export default async function NewBookingPage() {
  await requireAdmin("PROPRIETAR");
  const [programs, lessons, settings] = await Promise.all([
    db.program.findMany({ orderBy: { order: "asc" } }),
    db.lessonType.findMany({ orderBy: { order: "asc" } }),
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
            Pentru rezervările primite la telefon sau pe WhatsApp. Suprapunerile cu alte lecții sunt
            verificate automat.
          </p>
        </div>
      </div>
      <ManualBookingForm
        today={localDateKey(new Date(), settings.timezone)}
        programs={programs.map((p) => ({ id: p.id, name: t(p.name, "ro") }))}
        lessons={lessons.map((l) => ({
          id: l.id,
          name: t(l.name, "ro"),
          minParticipants: l.minParticipants,
          maxParticipants: l.maxParticipants,
          durations: [...l.durations].sort((a, b) => a - b),
        }))}
      />
    </>
  );
}
