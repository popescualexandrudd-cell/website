import { adminFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { csvCell } from "@/lib/admin/format";
import { urls } from "@/lib/paths";
import { deriveToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

/** Confirmed subscribers as CSV, each with a personal unsubscribe link to paste into the newsletter tool. */
export async function GET() {
  const session = await adminFromRequest("PROPRIETAR");
  if (!session) return new Response("Autentificare necesară.", { status: 401 });
  const rows = await db.newsletterSubscriber.findMany({
    where: { confirmedAt: { not: null } },
    orderBy: { createdAt: "asc" },
  });
  const lines = [
    ["Email", "Limba", "Confirmat la", "Versiunea politicii", "Link de dezabonare"]
      .map(csvCell)
      .join(";"),
    ...rows.map((s) =>
      [
        s.email,
        s.locale,
        s.confirmedAt?.toISOString() ?? "",
        s.policyVersion,
        urls.newsletter(`u.${deriveToken("newsletter-unsubscribe", s.id)}`, s.locale),
      ]
        .map(csvCell)
        .join(";"),
    ),
  ];
  await audit(session.user.id, "newsletter.export", "NewsletterSubscriber", null, {
    count: rows.length,
  });
  return new Response(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="newsletter-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
