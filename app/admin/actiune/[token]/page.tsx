import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { verifyPayload } from "@/lib/tokens";
import { bookingTitle, lessonLine, when } from "@/lib/admin/format";
import { statusLabel } from "@/lib/admin/booking-actions";
import { EmailActionForm } from "@/components/admin/EmailActionForm";

export const metadata: Metadata = { title: "Confirmare rezervare", referrer: "no-referrer" };

/**
 * Landing page of the buttons in the coach's email. Opening it changes nothing (mail scanners
 * open links); the signed token only allows confirming or declining this one booking, with one POST.
 */
export default async function EmailActionPage({ params }: PageProps<"/admin/actiune/[token]">) {
  const { token } = await params;
  const payload = verifyPayload(decodeURIComponent(token));
  const booking =
    payload && typeof payload.b === "string"
      ? await db.booking.findUnique({
          where: { id: payload.b },
          include: { program: true, lessonType: true },
        })
      : null;
  const settings = await db.siteSettings.findUniqueOrThrow({
    where: { id: 1 },
    select: { timezone: true },
  });
  const action = payload?.a === "decline" ? "decline" : "confirm";
  return (
    <main className="admin-login">
      <div className="admin-login-card">
        {!booking ? (
          <>
            <h1 className="admin-title">Linkul nu mai e valid</h1>
            <p className="mt-3">
              Linkul a expirat (e valabil 7 zile) sau rezervarea nu mai există. Deschide rezervarea
              din panoul de administrare.
            </p>
            <p className="mt-6">
              <Link href="/admin/rezervari" className="btn btn-primary">
                Deschide rezervările
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="admin-title">
              {action === "confirm" ? "Confirmi rezervarea?" : "Refuzi rezervarea?"}
            </h1>
            <table className="admin-table my-5">
              <tbody>
                <tr>
                  <th scope="row">Client</th>
                  <td>{bookingTitle(booking)}</td>
                </tr>
                <tr>
                  <th scope="row">Program</th>
                  <td>{lessonLine(booking)}</td>
                </tr>
                <tr>
                  <th scope="row">Când</th>
                  <td>{when(booking.startsAt, booking.endsAt, settings.timezone)}</td>
                </tr>
                <tr>
                  <th scope="row">Stare</th>
                  <td>{statusLabel(booking.status)}</td>
                </tr>
              </tbody>
            </table>
            {booking.status === "IN_ASTEPTARE" ? (
              <EmailActionForm token={decodeURIComponent(token)} action={action} />
            ) : (
              <p className="admin-ok">
                Rezervarea a fost deja procesată: {statusLabel(booking.status)}.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
