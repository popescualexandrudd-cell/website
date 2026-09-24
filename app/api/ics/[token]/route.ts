import { findBookingByToken } from "@/lib/booking";
import { buildIcs } from "@/lib/ics";
import { t } from "@/lib/i18n-content";
import { db } from "@/lib/db";
import { urls } from "@/lib/paths";

export const dynamic = "force-dynamic";

/** Calendar file for a booking, reachable only with the private manage token. */
export async function GET(_request: Request, context: RouteContext<"/api/ics/[token]">) {
  const { token } = await context.params;
  const booking = await findBookingByToken(token);
  if (!booking || (booking.status !== "CONFIRMATA" && booking.status !== "IN_ASTEPTARE")) {
    return new Response("Rezervarea nu există sau a fost anulată.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const settings = await db.siteSettings.findUniqueOrThrow({
    where: { id: 1 },
    select: { brandName: true },
  });
  const ics = buildIcs({
    uid: `${booking.code}@${new URL(urls.home("ro")).host}`,
    start: booking.startsAt,
    end: booking.endsAt,
    summary: `${t(booking.program.name, booking.locale)} · ${settings.brandName}`,
    description: `${booking.code}\n${urls.manageBooking(token, booking.locale)}`,
    location: booking.location
      ? `${booking.location.name}, ${booking.location.address}`
      : undefined,
    url: urls.manageBooking(token, booking.locale),
    status: booking.status === "CONFIRMATA" ? "CONFIRMED" : "TENTATIVE",
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="lectie-${booking.code}.ics"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
