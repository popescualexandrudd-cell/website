import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDaysToKey, groupOccurrences, localDateKey, zonedInstant } from "@/lib/availability";
import { bookingContacts, bookingTitle, dayLabel, programName, when } from "@/lib/admin/format";
import { t } from "@/lib/i18n-content";
import { BookingActions } from "@/components/admin/BookingActions";
import { OkNotice } from "@/components/admin/OkNotice";
import { BOOKING_OK } from "@/lib/admin/booking-done";
import { statusLabel } from "@/lib/admin/booking-actions";

export const metadata: Metadata = { title: "Azi" };

export default async function TodayPage({ searchParams }: PageProps<"/admin/azi">) {
  await requireAdmin("PROPRIETAR");
  const settings = await db.siteSettings.findUniqueOrThrow({
    where: { id: 1 },
    select: { timezone: true },
  });
  const tz = settings.timezone;
  const params = await searchParams;
  const requested = params.zi;
  const today = localDateKey(new Date(), tz);
  const key =
    typeof requested === "string" && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today;
  const start = zonedInstant(key, "00:00", tz);
  const end = zonedInstant(addDaysToKey(key, 1), "00:00", tz);

  const [bookings, schedules, exceptions] = await Promise.all([
    db.booking.findMany({
      where: {
        startsAt: { gte: start, lt: end },
        status: { in: ["IN_ASTEPTARE", "CONFIRMATA", "EFECTUATA", "NEPREZENTARE"] },
      },
      orderBy: { startsAt: "asc" },
      include: { program: true },
    }),
    db.groupSchedule.findMany({ where: { active: true }, include: { program: true } }),
    db.availabilityException.findMany({ where: { date: new Date(`${key}T00:00:00Z`) } }),
  ]);
  const sessions = groupOccurrences(schedules, key, key, exceptions, [], tz).map((o) => ({
    ...o,
    program: schedules.find((s) => s.id === o.groupScheduleId)?.program,
    members: schedules.find((s) => s.id === o.groupScheduleId)?.membersCount ?? 0,
  }));

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-title capitalize-first">
            {key === today ? "Azi" : dayLabel(start, tz)}
          </h1>
          <p className="capitalize-first">{dayLabel(start, tz)}</p>
        </div>
        <div className="admin-row-actions">
          <Link
            className="btn btn-secondary btn-small"
            href={`/admin/azi?zi=${addDaysToKey(key, -1)}`}
          >
            Ziua anterioară
          </Link>
          <Link
            className="btn btn-secondary btn-small"
            href={`/admin/azi?zi=${addDaysToKey(key, 1)}`}
          >
            Ziua următoare
          </Link>
        </div>
      </div>

      <OkNotice code={params.ok} messages={BOOKING_OK} />
      {bookings.length === 0 && sessions.length === 0 ? (
        <p className="text-cerneala-2">Nicio lecție în această zi.</p>
      ) : null}

      <div className="admin-rows">
        {bookings.map((b) => {
          const contact = bookingContacts(b, tz);
          return (
            <div key={b.id} className="admin-row">
              <div>
                <Link href={`/admin/rezervari/${b.id}`} className="admin-row-link">
                  <span className="admin-row-title numerals">
                    {when(b.startsAt, b.endsAt, tz, false)}
                  </span>{" "}
                  <span className="admin-row-title">{bookingTitle(b)}</span>
                </Link>
                <p className="admin-row-meta">
                  {programName(b)}
                  {b.participants > 1 ? ` · ${b.participants} persoane` : ""} ·{" "}
                  <span className={`status status--${b.status}`}>{statusLabel(b.status)}</span>
                </p>
                <div className="admin-row-actions mt-2">
                  {contact.tel ? (
                    <a href={contact.tel} className="btn btn-secondary btn-small">
                      Sună
                    </a>
                  ) : null}
                  {contact.whatsapp ? (
                    <a
                      href={contact.whatsapp}
                      className="btn btn-secondary btn-small"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp
                    </a>
                  ) : null}
                </div>
              </div>
              <BookingActions id={b.id} status={b.status} compact back={`/admin/azi?zi=${key}`} />
            </div>
          );
        })}
        {sessions.map((s) => (
          <div key={`${s.groupScheduleId}-${s.start.toISOString()}`} className="admin-row">
            <div>
              <span className="admin-row-title numerals">{when(s.start, s.end, tz, false)}</span>{" "}
              <span className="admin-row-title">
                Grupă: {s.program ? t(s.program.name, "ro") : ""}
              </span>
              <p className="admin-row-meta">
                {s.members} membri obișnuiți ·{" "}
                {bookings.filter((b) => b.groupScheduleId === s.groupScheduleId).length} cereri noi
                · capacitate {s.capacity}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
