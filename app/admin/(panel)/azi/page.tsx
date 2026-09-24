import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDaysToKey, localDateKey, zonedInstant } from "@/lib/availability";
import { bookingContacts, bookingTitle, dayLabel, lessonLine, when } from "@/lib/admin/format";
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

  const bookings = await db.booking.findMany({
    where: {
      startsAt: { gte: start, lt: end },
      status: { in: ["IN_ASTEPTARE", "CONFIRMATA", "EFECTUATA", "NEPREZENTARE"] },
    },
    orderBy: { startsAt: "asc" },
    include: { program: true, lessonType: true },
  });

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
      {bookings.length === 0 ? (
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
                  {lessonLine(b)}
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
      </div>
    </>
  );
}
