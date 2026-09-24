import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDaysToKey, localDateKey, openWindowsForDate, zonedInstant } from "@/lib/availability";
import { when, bookingTitle, lessonLine, weekKeys } from "@/lib/admin/format";
import { BookingActions } from "@/components/admin/BookingActions";
import { OkNotice } from "@/components/admin/OkNotice";
import { BOOKING_OK } from "@/lib/admin/booking-done";
import { TODO_MARK } from "@/lib/i18n-content";

export const metadata: Metadata = { title: "Tablou de bord" };

async function occupancy(tz: string, monthOffset: number) {
  const today = localDateKey(new Date(), tz);
  const [y, m] = today.split("-").map(Number) as [number, number];
  const first = new Date(Date.UTC(y, m - 1 + monthOffset, 1));
  const firstKey = first.toISOString().slice(0, 10);
  const lastDay = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const lastKey = `${firstKey.slice(0, 8)}${String(lastDay).padStart(2, "0")}`;
  const [rules, exceptions, bookings] = await Promise.all([
    db.availabilityRule.findMany(),
    db.availabilityException.findMany({
      where: {
        date: { gte: new Date(`${firstKey}T00:00:00Z`), lte: new Date(`${lastKey}T00:00:00Z`) },
      },
    }),
    db.booking.findMany({
      where: {
        status: { in: ["IN_ASTEPTARE", "CONFIRMATA", "EFECTUATA"] },
        startsAt: {
          gte: zonedInstant(firstKey, "00:00", tz),
          lt: zonedInstant(addDaysToKey(lastKey, 1), "00:00", tz),
        },
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);
  let open = 0;
  for (let key = firstKey; key <= lastKey; key = addDaysToKey(key, 1)) {
    for (const w of openWindowsForDate(key, rules, exceptions, tz)) open += w.end - w.start;
  }
  const booked = bookings.reduce((sum, b) => sum + (b.endsAt.getTime() - b.startsAt.getTime()), 0);
  const label = first.toLocaleDateString("ro-RO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return {
    label,
    percent: open > 0 ? Math.round((booked / open) * 100) : 0,
    hours: Math.round(booked / 3_600_000),
  };
}

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const { user } = await requireAdmin();
  const params = await searchParams;
  const forbidden = params.interzis === "1";
  const isOwner = user.role === "PROPRIETAR";
  const settings = await db.siteSettings.findUniqueOrThrow({ where: { id: 1 } });
  const tz = settings.timezone;
  const week = weekKeys(localDateKey(new Date(), tz));
  const weekStart = zonedInstant(week[0]!, "00:00", tz);
  const weekEnd = zonedInstant(addDaysToKey(week[6]!, 1), "00:00", tz);

  const [pending, weekCount, newMessages, newWaitlist, unreviewedLegal, pendingList, months] =
    await Promise.all([
      isOwner
        ? db.booking.count({ where: { status: "IN_ASTEPTARE", startsAt: { gte: new Date() } } })
        : 0,
      isOwner
        ? db.booking.count({
            where: {
              status: { in: ["CONFIRMATA", "IN_ASTEPTARE"] },
              startsAt: { gte: weekStart, lt: weekEnd },
            },
          })
        : 0,
      isOwner ? db.contactMessage.count({ where: { status: "NOU" } }) : 0,
      isOwner ? db.waitlistEntry.count({ where: { status: "NOU" } }) : 0,
      db.legalPage.count({ where: { reviewedByLawyer: false } }),
      isOwner
        ? db.booking.findMany({
            where: { status: "IN_ASTEPTARE", startsAt: { gte: new Date() } },
            orderBy: { startsAt: "asc" },
            take: 5,
            include: { program: true, lessonType: true },
          })
        : [],
      isOwner ? Promise.all([0, 1, 2].map((offset) => occupancy(tz, offset))) : [],
    ]);

  const warnings: string[] = [];
  if (!process.env.COACH_NOTIFY_EMAIL && !settings.email.includes("@")) {
    warnings.push(
      "Nu ai setat o adresă de email pentru notificări: nu primești emailuri despre rezervări noi. Completează emailul în Setări.",
    );
  }
  if (settings.brandName.includes(TODO_MARK) || settings.phone.includes(TODO_MARK)) {
    warnings.push(
      "Site-ul are încă texte marcate [DE COMPLETAT] (nume, telefon, adresă, prețuri). Lista completă e în CONTENT-TODO.md.",
    );
  }
  if (unreviewedLegal > 0)
    warnings.push(
      `${unreviewedLegal} pagini legale sunt ciorne „De verificat de un jurist". Le găsești în Conținut → Pagini legale.`,
    );

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-title">Bună, {user.name.split(" ")[0]}</h1>
          <p>
            {new Date().toLocaleDateString("ro-RO", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: tz,
            })}
          </p>
        </div>
        {isOwner ? (
          <Link href="/admin/rezervari/noua" className="btn btn-primary btn-small">
            Adaugă o rezervare
          </Link>
        ) : null}
      </div>

      <OkNotice code={params.ok} messages={BOOKING_OK} />
      {forbidden ? (
        <p className="admin-warning mb-4">
          Această secțiune e disponibilă doar contului de proprietar.
        </p>
      ) : null}
      {warnings.map((w) => (
        <p key={w} className="admin-warning">
          {w}
        </p>
      ))}

      {isOwner ? (
        <>
          <div className="admin-stats admin-section">
            <Link href="/admin/rezervari?status=IN_ASTEPTARE" className="admin-stat">
              <strong>{pending}</strong>
              <span>rezervări de confirmat</span>
            </Link>
            <Link href="/admin/rezervari?vedere=saptamana" className="admin-stat">
              <strong>{weekCount}</strong>
              <span>lecții săptămâna aceasta</span>
            </Link>
            <Link href="/admin/mesaje" className="admin-stat">
              <strong>{newMessages}</strong>
              <span>mesaje noi</span>
            </Link>
            <Link href="/admin/lista-asteptare" className="admin-stat">
              <strong>{newWaitlist}</strong>
              <span>cereri pe lista de așteptare</span>
            </Link>
          </div>

          <section className="admin-section">
            <h2 className="admin-h2">De confirmat</h2>
            {pendingList.length === 0 ? (
              <p className="text-cerneala-2">Nicio rezervare nu așteaptă confirmarea.</p>
            ) : (
              <div className="admin-rows">
                {pendingList.map((b) => (
                  <div key={b.id} className="admin-row">
                    <Link href={`/admin/rezervari/${b.id}`} className="admin-row-link">
                      <span className="admin-row-title">{bookingTitle(b)}</span>
                      <span className="admin-row-meta block">
                        {when(b.startsAt, b.endsAt, tz)} · {lessonLine(b)} · {b.code}
                      </span>
                    </Link>
                    <BookingActions id={b.id} status={b.status} compact back="/admin" />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="admin-section">
            <h2 className="admin-h2">Gradul de ocupare</h2>
            <p className="mb-3 text-note text-cerneala-2">
              Ore de lecții individuale rezervate din orele deschise în disponibilitate.
            </p>
            <div className="bar-chart">
              {months.map((month) => (
                <div key={month.label} className="bar-chart-row">
                  <span className="capitalize-first">{month.label}</span>
                  <span className="bar-chart-track" role="img" aria-label={`${month.percent}%`}>
                    <span
                      className="bar-chart-fill block"
                      style={{ width: `${Math.min(100, month.percent)}%` }}
                    />
                  </span>
                  <span className="numerals">{month.percent}%</span>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <section className="admin-section">
        <h2 className="admin-h2">Scurtături</h2>
        <div className="admin-row-actions">
          <Link href="/admin/continut" className="btn btn-secondary btn-small">
            Editează conținutul
          </Link>
          <Link href="/admin/media" className="btn btn-secondary btn-small">
            Încarcă imagini
          </Link>
          <a href="/api/preview/enable?redirect=/" className="btn btn-secondary btn-small">
            Previzualizează site-ul cu ciornele
          </a>
        </div>
      </section>
    </>
  );
}
