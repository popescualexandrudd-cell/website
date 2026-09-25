import type { Metadata } from "next";
import Link from "next/link";
import { attributionLabel } from "@/lib/attribution";
import { roCount } from "@/lib/format";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { bookingContacts, bookingTitle, programName, when } from "@/lib/admin/format";
import { t } from "@/lib/i18n-content";
import { statusLabel } from "@/lib/admin/booking-actions";
import { BookingActions } from "@/components/admin/BookingActions";
import { NotesForm } from "@/components/admin/NotesForm";

export const metadata: Metadata = { title: "Rezervare" };

const SOURCE: Record<string, string> = {
  SITE: "site",
  ADMIN: "admin",
  TELEFON: "telefon",
  WHATSAPP: "WhatsApp",
};
const LEVEL: Record<string, string> = {
  INCEPATOR: "începător",
  INTERMEDIAR: "a mai jucat",
  AVANSAT: "joacă constant",
  COMPETITIE: "competiții",
  TOATE: "—",
};

export default async function BookingDetailPage({
  params,
  searchParams,
}: PageProps<"/admin/rezervari/[id]">) {
  await requireAdmin("PROPRIETAR");
  const { id } = await params;
  const saved = (await searchParams).salvat === "1";
  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      program: true,
      lessonType: true,
      location: true,
      client: true,
      emailLogs: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!booking) notFound();
  const settings = await db.siteSettings.findUniqueOrThrow({
    where: { id: 1 },
    select: { timezone: true },
  });
  const tz = settings.timezone;
  const contact = bookingContacts(booking, tz);
  const rows: [string, string][] = [
    ["Cod", booking.code],
    ["Program", programName(booking)],
    ["Antrenamentul", booking.lessonType ? t(booking.lessonType.name, "ro") : "—"],
    ["Durata", roCount(booking.durationMin, "un minut", "minute")],
    ["Când", when(booking.startsAt, booking.endsAt, tz)],
    ["Participanți", String(booking.participants)],
    ["Telefon", booking.phone || "—"],
    ["Email", booking.email.endsWith(".invalid") ? "—" : booking.email],
    ["Sursă", SOURCE[booking.source] ?? booking.source],
    ["Nivel declarat", booking.declaredLevel ? (LEVEL[booking.declaredLevel] ?? "—") : "—"],
    [
      "Acord GDPR",
      `${booking.gdprConsentAt.toLocaleString("ro-RO", { timeZone: tz })} · politica ${booking.policyVersion}`,
    ],
  ];
  if (booking.forMinor)
    rows.splice(6, 0, [
      "Copil",
      `${booking.childFirstName ?? "—"}${booking.childAge ? `, ${booking.childAge} ani` : ""}`,
    ]);
  if (booking.source === "SITE") {
    const after = rows.findIndex(([label]) => label === "Sursă") + 1;
    rows.splice(after, 0, [
      "Venit din",
      attributionLabel(booking.attribution) ?? "direct sau necunoscut",
    ]);
  }
  if (booking.cancelReason) rows.push(["Motiv anulare", booking.cancelReason]);

  return (
    <>
      <p className="mb-2 text-note">
        <Link href="/admin/rezervari" className="link">
          Toate rezervările
        </Link>
      </p>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-title">{bookingTitle(booking)}</h1>
          <p>
            <span className={`status status--${booking.status}`}>
              {statusLabel(booking.status)}
            </span>{" "}
            · {when(booking.startsAt, booking.endsAt, tz)}
          </p>
        </div>
      </div>
      {saved ? <p className="admin-ok mb-4">Rezervarea e salvată.</p> : null}

      <div className="admin-row-actions mb-6">
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
            Scrie pe WhatsApp
          </a>
        ) : null}
        {contact.mail ? (
          <a href={contact.mail} className="btn btn-secondary btn-small">
            Trimite email
          </a>
        ) : null}
      </div>

      <section className="admin-panel">
        <BookingActions id={booking.id} status={booking.status} />
      </section>

      <section className="admin-section">
        <h2 className="admin-h2">Detalii</h2>
        <table className="admin-table">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {booking.message ? (
          <div className="mt-4">
            <h3 className="admin-h3">Mesajul clientului</h3>
            <p className="whitespace-pre-line">{booking.message}</p>
          </div>
        ) : null}
        {booking.client ? (
          <p className="mt-4">
            <Link href={`/admin/clienti/${booking.client.id}`} className="link">
              Fișa clientului ({booking.client.name})
            </Link>
          </p>
        ) : null}
      </section>

      <section className="admin-section">
        <NotesForm id={booking.id} notes={booking.internalNotes ?? ""} />
      </section>

      {booking.emailLogs.length > 0 ? (
        <section className="admin-section">
          <h2 className="admin-h2">Emailuri trimise</h2>
          <table className="admin-table">
            <tbody>
              {booking.emailLogs.map((log) => (
                <tr key={log.id}>
                  <td>{log.subject}</td>
                  <td>{log.to}</td>
                  <td>
                    {log.status === "TRIMIS"
                      ? "trimis"
                      : log.status === "ESUAT"
                        ? `eșuat: ${log.error ?? ""}`
                        : "în curs"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </>
  );
}
