import { adminFromRequest } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { exportClientData } from "@/lib/gdpr";

export const dynamic = "force-dynamic";

/** Everything stored about one client, as a JSON file to send them (GDPR right of access). */
export async function GET(_request: Request, ctx: RouteContext<"/api/admin/export/client/[id]">) {
  const session = await adminFromRequest("PROPRIETAR");
  if (!session) return new Response("Autentificare necesară.", { status: 401 });
  const { id } = await ctx.params;
  const data = await exportClientData(id);
  if (!data) return new Response("Clientul nu există.", { status: 404 });
  await audit(session.user.id, "client.export-gdpr", "Client", id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="date-client-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
