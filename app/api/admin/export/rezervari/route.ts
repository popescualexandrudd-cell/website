import { adminFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDaysToKey, zonedInstant } from "@/lib/availability";
import { csvCell } from "@/lib/admin/format";
import { statusLabel } from "@/lib/admin/booking-actions";
import { audit } from "@/lib/audit";
import { t } from "@/lib/i18n-content";
import { formatInTimeZone } from "date-fns-tz";
import type { BookingStatus, Prisma } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

/** CSV export of bookings (UTF-8 with BOM and ";" separators, so Excel in Romanian opens it cleanly). */
export async function GET(request: Request) {
  const session = await adminFromRequest("PROPRIETAR");
  if (!session) return new Response("Autentificare necesară.", { status: 401 });
  const url = new URL(request.url);
  const settings = await db.siteSettings.findUniqueOrThrow({
    where: { id: 1 },
    select: { timezone: true },
  });
  const tz = settings.timezone;
  const status = url.searchParams.get("status") as BookingStatus | null;
  const from = url.searchParams.get("de");
  const to = url.searchParams.get("pana");
  const where: Prisma.BookingWhereInput = {
    ...(status ? { status } : {}),
    ...(from || to
      ? {
          startsAt: {
            ...(from && /^\d{4}-\d{2}-\d{2}$/.test(from)
              ? { gte: zonedInstant(from, "00:00", tz) }
              : {}),
            ...(to && /^\d{4}-\d{2}-\d{2}$/.test(to)
              ? { lt: zonedInstant(addDaysToKey(to, 1), "00:00", tz) }
              : {}),
          },
        }
      : {}),
  };
  const bookings = await db.booking.findMany({
    where,
    orderBy: { startsAt: "asc" },
    include: { program: true },
    take: 10_000,
  });
  const header = [
    "Cod",
    "Data",
    "Ora",
    "Sfârșit",
    "Program",
    "Stare",
    "Nume",
    "Telefon",
    "Email",
    "Participanți",
    "Copil",
    "Vârstă copil",
    "Sursă",
    "Mesaj",
    "Note interne",
    "Creată",
  ];
  const lines = bookings.map((b) =>
    [
      b.code,
      formatInTimeZone(b.startsAt, tz, "yyyy-MM-dd"),
      formatInTimeZone(b.startsAt, tz, "HH:mm"),
      formatInTimeZone(b.endsAt, tz, "HH:mm"),
      t(b.program.name, "ro"),
      statusLabel(b.status),
      b.name,
      b.phone,
      b.email.endsWith(".invalid") ? "" : b.email,
      b.participants,
      b.childFirstName ?? "",
      b.childAge ?? "",
      b.source,
      b.message ?? "",
      b.internalNotes ?? "",
      formatInTimeZone(b.createdAt, tz, "yyyy-MM-dd HH:mm"),
    ]
      .map(csvCell)
      .join(";"),
  );
  await audit(session.user.id, "rezervari.export", "Booking", null, { count: bookings.length });
  const body = `﻿${[header.map(csvCell).join(";"), ...lines].join("\r\n")}\r\n`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rezervari-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
