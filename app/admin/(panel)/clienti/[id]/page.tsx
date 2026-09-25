import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n-content";
import { formatPrice, mailLink, telLink, whatsappLink } from "@/lib/format";
import { countLabel, lessonLine, when } from "@/lib/admin/format";
import { statusLabel } from "@/lib/admin/booking-actions";
import { eraseClientAction } from "@/app/actions/admin-clients";
import { ActionButton } from "@/components/admin/ActionButton";
import { ClientForm, PackageForm } from "@/components/admin/ClientForms";

export const metadata: Metadata = { title: "Client" };

export default async function ClientPage({ params }: PageProps<"/admin/clienti/[id]">) {
  await requireAdmin("PROPRIETAR");
  const { id } = await params;
  const client = await db.client.findUnique({
    where: { id },
    include: {
      activePlan: true,
      bookings: {
        orderBy: { startsAt: "desc" },
        include: { program: true, lessonType: true },
        take: 200,
      },
    },
  });
  if (!client) notFound();
  const [settings, plans] = await Promise.all([
    db.siteSettings.findUniqueOrThrow({ where: { id: 1 }, select: { timezone: true } }),
    db.pricingPlan.findMany({
      where: { isPackage: true, active: true },
      orderBy: { order: "asc" },
    }),
  ]);
  const tz = settings.timezone;
  const done = client.bookings.filter((b) => b.status === "EFECTUATA").length;
  const tel = telLink(client.phone);
  const wa = whatsappLink(client.phone, `Bună, ${client.name}!`);
  const mail = client.email && !client.email.endsWith(".invalid") ? mailLink(client.email) : null;

  return (
    <>
      <p className="mb-2 text-note">
        <Link href="/admin/clienti" className="link">
          Toți clienții
        </Link>
      </p>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-title">{client.name}</h1>
          <p>
            Client din {client.createdAt.toLocaleDateString("ro-RO", { timeZone: tz })} ·{" "}
            {countLabel(client.bookings.length, "rezervare", "rezervări")} ·{" "}
            {countLabel(done, "antrenament efectuat", "antrenamente efectuate")}
          </p>
        </div>
        <div className="admin-row-actions">
          {tel ? (
            <a href={tel} className="btn btn-secondary btn-small">
              Sună
            </a>
          ) : null}
          {wa ? (
            <a href={wa} className="btn btn-secondary btn-small" target="_blank" rel="noopener">
              Scrie pe WhatsApp
            </a>
          ) : null}
          {mail ? (
            <a href={mail} className="btn btn-secondary btn-small">
              Trimite email
            </a>
          ) : null}
        </div>
      </div>

      <section className="admin-section">
        <h2 className="admin-h2">Pachet</h2>
        {client.activePlan ? (
          <p className="mb-3">
            Pachet activ: <strong className="font-medium">{t(client.activePlan.name, "ro")}</strong>
            {client.sessionsRemaining !== null
              ? ` · ${countLabel(client.sessionsRemaining, "antrenament rămas", "antrenamente rămase")}`
              : ""}
            {client.packageValidUntil
              ? ` · valabil până la ${client.packageValidUntil.toLocaleDateString("ro-RO", { timeZone: "UTC" })}`
              : ""}
          </p>
        ) : (
          <p className="mb-3 text-cerneala-2">Niciun pachet activ.</p>
        )}
        <PackageForm
          id={client.id}
          plans={plans.map((p) => ({
            id: p.id,
            label: `${t(p.name, "ro")}${p.price !== null ? ` · ${formatPrice(p.price.toString(), p.currency, "ro")}` : ""}${p.sessions ? ` · ${p.sessions} antrenamente` : ""}`,
          }))}
        />
      </section>

      <section className="admin-section">
        <ClientForm
          client={{
            id: client.id,
            name: client.name,
            email: client.email ?? "",
            phone: client.phone ?? "",
            notes: client.notes ?? "",
            sessionsRemaining:
              client.sessionsRemaining === null ? "" : String(client.sessionsRemaining),
            packageValidUntil: client.packageValidUntil
              ? client.packageValidUntil.toISOString().slice(0, 10)
              : "",
          }}
        />
      </section>

      <section className="admin-section">
        <h2 className="admin-h2">Istoric</h2>
        {client.bookings.length === 0 ? (
          <p className="text-cerneala-2">Nicio rezervare.</p>
        ) : (
          <div className="admin-rows">
            {client.bookings.map((b) => (
              <div key={b.id} className="admin-row">
                <Link href={`/admin/rezervari/${b.id}`} className="admin-row-link">
                  <span className="admin-row-title">{when(b.startsAt, b.endsAt, tz)}</span>
                  <span className="admin-row-meta block">
                    {lessonLine(b)} · {b.code} ·{" "}
                    <span className={`status status--${b.status}`}>{statusLabel(b.status)}</span>
                  </span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="admin-section">
        <h2 className="admin-h2">Datele personale (GDPR)</h2>
        <p className="mb-3 max-w-prose text-note text-cerneala-2">
          La cerere, clientul are dreptul să primească toate datele pe care le păstrezi despre el și
          să ceară ștergerea lor. Ștergerea anonimizează rezervările (rămân doar data și programul,
          pentru statistică) și șterge mesajele, cererile de pe lista de așteptare, abonarea la
          newsletter, recenziile și copiile emailurilor.
        </p>
        <div className="admin-row-actions">
          <a href={`/api/admin/export/client/${client.id}`} className="btn btn-secondary btn-small">
            Descarcă datele clientului (JSON)
          </a>
          <ActionButton
            action={eraseClientAction}
            fields={{ id: client.id }}
            label="Șterge datele clientului"
            variant="danger"
            confirm="Ștergerea e definitivă."
          />
        </div>
      </section>
    </>
  );
}
