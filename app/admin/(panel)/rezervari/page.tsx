import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDaysToKey, localDateKey, zonedInstant } from "@/lib/availability";
import { bookingTitle, dayLabel, programName, weekKeys, when } from "@/lib/admin/format";
import { statusLabel } from "@/lib/admin/booking-actions";
import type { BookingStatus, Prisma } from "@/lib/generated/prisma/client";

export const metadata: Metadata = { title: "Rezervări" };

const STATUSES: BookingStatus[] = [
  "IN_ASTEPTARE",
  "CONFIRMATA",
  "EFECTUATA",
  "NEPREZENTARE",
  "ANULATA_CLIENT",
  "ANULATA_ANTRENOR",
];
const PAGE_SIZE = 30;

export default async function BookingsPage({ searchParams }: PageProps<"/admin/rezervari">) {
  await requireAdmin("PROPRIETAR");
  const params = await searchParams;
  const get = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const settings = await db.siteSettings.findUniqueOrThrow({
    where: { id: 1 },
    select: { timezone: true },
  });
  const tz = settings.timezone;
  const today = localDateKey(new Date(), tz);
  const view = get("vedere") === "saptamana" ? "week" : "list";

  if (view === "week") {
    const anchor = /^\d{4}-\d{2}-\d{2}$/.test(get("de")) ? get("de") : today;
    const days = weekKeys(anchor);
    const start = zonedInstant(days[0]!, "00:00", tz);
    const end = zonedInstant(addDaysToKey(days[6]!, 1), "00:00", tz);
    const bookings = await db.booking.findMany({
      where: {
        startsAt: { gte: start, lt: end },
        status: { in: ["IN_ASTEPTARE", "CONFIRMATA", "EFECTUATA", "NEPREZENTARE"] },
      },
      orderBy: { startsAt: "asc" },
      include: { program: true },
    });
    return (
      <>
        <div className="admin-page-head">
          <div>
            <h1 className="admin-title">Săptămâna</h1>
            <p>
              {dayLabel(start, tz)} – {dayLabel(zonedInstant(days[6]!, "12:00", tz), tz)}
            </p>
          </div>
          <div className="admin-row-actions">
            <Link
              className="btn btn-secondary btn-small"
              href={`/admin/rezervari?vedere=saptamana&de=${addDaysToKey(days[0]!, -7)}`}
            >
              Săptămâna anterioară
            </Link>
            <Link
              className="btn btn-secondary btn-small"
              href={`/admin/rezervari?vedere=saptamana&de=${addDaysToKey(days[0]!, 7)}`}
            >
              Săptămâna următoare
            </Link>
            <Link className="btn btn-secondary btn-small" href="/admin/rezervari">
              Listă
            </Link>
          </div>
        </div>
        <div className="week">
          {days.map((key) => {
            const items = bookings.filter((b) => localDateKey(b.startsAt, tz) === key);
            return (
              <section key={key} className="week-day" data-today={key === today || undefined}>
                <h3 className="capitalize-first">{dayLabel(zonedInstant(key, "12:00", tz), tz)}</h3>
                {items.length === 0 ? <p className="text-note text-cerneala-2">—</p> : null}
                {items.map((b) => (
                  <Link
                    key={b.id}
                    href={`/admin/rezervari/${b.id}`}
                    className="week-item"
                    data-status={b.status}
                    data-kind={b.groupScheduleId ? "group" : "lesson"}
                  >
                    <span className="numerals font-medium">
                      {when(b.startsAt, b.endsAt, tz, false)}
                    </span>
                    <br />
                    {bookingTitle(b)}
                    <br />
                    <span className="text-cerneala-2">{programName(b)}</span>
                  </Link>
                ))}
              </section>
            );
          })}
        </div>
      </>
    );
  }

  const status = STATUSES.includes(get("status") as BookingStatus)
    ? (get("status") as BookingStatus)
    : null;
  const from = /^\d{4}-\d{2}-\d{2}$/.test(get("de")) ? get("de") : "";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(get("pana")) ? get("pana") : "";
  const q = get("q").trim().slice(0, 100);
  const page = Math.max(1, Number.parseInt(get("pagina") || "1", 10) || 1);
  const where: Prisma.BookingWhereInput = {
    ...(status ? { status } : {}),
    ...(from || to
      ? {
          startsAt: {
            ...(from ? { gte: zonedInstant(from, "00:00", tz) } : {}),
            ...(to ? { lt: zonedInstant(addDaysToKey(to, 1), "00:00", tz) } : {}),
          },
        }
      : !status
        ? { startsAt: { gte: zonedInstant(today, "00:00", tz) } }
        : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { code: { contains: q.toUpperCase() } },
          ],
        }
      : {}),
  };
  const [bookings, total] = await Promise.all([
    db.booking.findMany({
      where,
      orderBy: { startsAt: from || to || status ? "desc" : "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { program: true },
    }),
    db.booking.count({ where }),
  ]);
  const exportQuery = new URLSearchParams({
    ...(status ? { status } : {}),
    ...(from ? { de: from } : {}),
    ...(to ? { pana: to } : {}),
  }).toString();
  const pageLink = (p: number) =>
    `/admin/rezervari?${new URLSearchParams({ ...(status ? { status } : {}), ...(from ? { de: from } : {}), ...(to ? { pana: to } : {}), ...(q ? { q } : {}), pagina: String(p) })}`;

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-title">Rezervări</h1>
          <p>{!status && !from && !to && !q ? "Lecțiile de azi încolo." : `${total} rezultate`}</p>
        </div>
        <div className="admin-row-actions">
          <Link href="/admin/rezervari/noua" className="btn btn-primary btn-small">
            Adaugă o rezervare
          </Link>
          <Link href="/admin/rezervari?vedere=saptamana" className="btn btn-secondary btn-small">
            Vedere pe săptămână
          </Link>
          <a
            href={`/api/admin/export/rezervari?${exportQuery}`}
            className="btn btn-secondary btn-small"
          >
            Exportă CSV
          </a>
        </div>
      </div>

      <form className="admin-filters" method="get">
        <label className="field">
          <span className="field-label">Stare</span>
          <select name="status" defaultValue={status ?? ""} className="input">
            <option value="">Toate</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">De la</span>
          <input type="date" name="de" defaultValue={from} className="input" />
        </label>
        <label className="field">
          <span className="field-label">Până la</span>
          <input type="date" name="pana" defaultValue={to} className="input" />
        </label>
        <label className="field">
          <span className="field-label">Caută (nume, email, telefon, cod)</span>
          <input type="search" name="q" defaultValue={q} className="input" />
        </label>
        <button type="submit" className="btn btn-secondary">
          Filtrează
        </button>
      </form>

      {bookings.length === 0 ? (
        <p className="text-cerneala-2">Nicio rezervare pentru aceste filtre.</p>
      ) : null}
      <div className="admin-rows">
        {bookings.map((b) => (
          <Link key={b.id} href={`/admin/rezervari/${b.id}`} className="admin-row admin-row-link">
            <span>
              <span className="admin-row-title">{bookingTitle(b)}</span>
              <span className="admin-row-meta block">
                {when(b.startsAt, b.endsAt, tz)} · {programName(b)} · {b.code}
              </span>
            </span>
            <span className={`status status--${b.status}`}>{statusLabel(b.status)}</span>
          </Link>
        ))}
      </div>
      {total > PAGE_SIZE ? (
        <nav className="admin-row-actions mt-6" aria-label="Pagini">
          {page > 1 ? (
            <Link className="btn btn-secondary btn-small" href={pageLink(page - 1)}>
              Pagina anterioară
            </Link>
          ) : null}
          <span className="self-center text-note">
            Pagina {page} din {Math.ceil(total / PAGE_SIZE)}
          </span>
          {page * PAGE_SIZE < total ? (
            <Link className="btn btn-secondary btn-small" href={pageLink(page + 1)}>
              Pagina următoare
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
