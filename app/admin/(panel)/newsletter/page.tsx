import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteSubscriberAction } from "@/app/actions/admin-inbox";
import { ActionButton } from "@/components/admin/ActionButton";
import { OkNotice } from "@/components/admin/OkNotice";

export const metadata: Metadata = { title: "Newsletter" };

export default async function NewsletterPage({ searchParams }: PageProps<"/admin/newsletter">) {
  await requireAdmin("PROPRIETAR");
  const { ok } = await searchParams;
  const settings = await db.siteSettings.findUniqueOrThrow({
    where: { id: 1 },
    select: { timezone: true, newsletterEnabled: true },
  });
  const subscribers = await db.newsletterSubscriber.findMany({
    orderBy: { createdAt: "desc" },
    take: 2000,
  });
  const confirmed = subscribers.filter((s) => s.confirmedAt);

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-title">Newsletter</h1>
          <p>
            {confirmed.length} abonați confirmați, {subscribers.length - confirmed.length} care nu
            au confirmat încă adresa (dublă confirmare).
          </p>
        </div>
        <a href="/api/admin/export/newsletter" className="btn btn-secondary btn-small">
          Descarcă lista (CSV)
        </a>
      </div>
      <OkNotice code={ok} messages={{ sters: "Adresa a fost ștearsă din listă." }} />
      {!settings.newsletterEnabled ? (
        <p className="admin-warning mb-4">Formularul de newsletter e oprit din Setări → Funcții.</p>
      ) : null}
      <p className="mb-4 text-note text-cerneala-2">
        Lista descărcată conține doar adresele confirmate și, pentru fiecare, linkul personal de
        dezabonare. Pune linkul în fiecare email trimis abonaților (de exemplu din Mailchimp sau
        Brevo); cine îl folosește dispare automat din listă.
      </p>
      {subscribers.length === 0 ? (
        <p className="text-cerneala-2">Niciun abonat încă.</p>
      ) : (
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Lista abonaților">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Email</th>
                <th scope="col">Stare</th>
                <th scope="col">Înscris</th>
                <th scope="col">Limba</th>
                <th scope="col">
                  <span className="sr-only">Acțiuni</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((s) => (
                <tr key={s.id}>
                  <td className="break-all">{s.email}</td>
                  <td>{s.confirmedAt ? "confirmat" : "neconfirmat"}</td>
                  <td>
                    {s.createdAt.toLocaleDateString("ro-RO", { timeZone: settings.timezone })}
                  </td>
                  <td>{s.locale.toUpperCase()}</td>
                  <td>
                    <ActionButton
                      action={deleteSubscriberAction}
                      fields={{ id: s.id, back: "/admin/newsletter" }}
                      label="Șterge adresa"
                      variant="danger"
                      confirm="Se șterge definitiv."
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
