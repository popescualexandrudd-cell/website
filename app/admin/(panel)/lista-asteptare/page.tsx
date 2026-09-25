import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n-content";
import { mailLink, telLink, whatsappLink } from "@/lib/format";
import { deleteWaitlistAction, setWaitlistStatusAction } from "@/app/actions/admin-inbox";
import { ActionButton } from "@/components/admin/ActionButton";
import { StatusTabs } from "@/components/admin/StatusTabs";
import { OkNotice } from "@/components/admin/OkNotice";
import { currentPath } from "@/lib/admin/redirect";
import type { WaitlistStatus } from "@/lib/generated/prisma/client";

export const metadata: Metadata = { title: "Evaluări și așteptare" };

const LABEL: Record<WaitlistStatus, string> = {
  NOU: "nou",
  CONTACTAT: "contactat",
  INSCRIS: "înscris",
  ARHIVAT: "arhivat",
};
const STATUSES: WaitlistStatus[] = ["NOU", "CONTACTAT", "INSCRIS", "ARHIVAT"];

export default async function WaitlistPage({ searchParams }: PageProps<"/admin/lista-asteptare">) {
  await requireAdmin("PROPRIETAR");
  const params = await searchParams;
  const back = currentPath("/admin/lista-asteptare", params);
  const raw = params.stare;
  const status: WaitlistStatus = STATUSES.find((s) => s === raw) ?? "NOU";
  const settings = await db.siteSettings.findUniqueOrThrow({
    where: { id: 1 },
    select: { timezone: true },
  });
  const [entries, counts] = await Promise.all([
    db.waitlistEntry.findMany({
      where: { status, anonymizedAt: null },
      orderBy: { createdAt: "asc" },
      include: { program: true, group: true },
      take: 300,
    }),
    db.waitlistEntry.groupBy({ by: ["status"], _count: true, where: { anonymizedAt: null } }),
  ]);
  const count = (s: WaitlistStatus) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-title">Evaluări și listă de așteptare</h1>
          <p>
            Cererile de evaluare pentru academia de juniori și cei care așteaptă un loc. Primii
            înscriși sunt primii în listă.
          </p>
        </div>
      </div>
      <OkNotice
        code={params.ok}
        messages={{
          contactat: "Cererea e marcată „contactat”.",
          inscris: "Cererea e marcată „înscris”.",
          arhivat: "Cererea e arhivată.",
          nou: "Cererea e marcată nouă.",
          sters: "Cererea a fost ștearsă.",
        }}
      />
      <StatusTabs
        base="/admin/lista-asteptare"
        current={status}
        tabs={[
          { value: "NOU", label: "Noi", count: count("NOU") },
          { value: "CONTACTAT", label: "Contactați", count: count("CONTACTAT") },
          { value: "INSCRIS", label: "Înscriși", count: count("INSCRIS") },
          { value: "ARHIVAT", label: "Arhivați", count: count("ARHIVAT") },
        ]}
      />
      {entries.length === 0 ? (
        <p className="text-cerneala-2">Nicio cerere aici.</p>
      ) : (
        <div className="admin-rows">
          {entries.map((e, index) => {
            const evaluation = e.kind === "EVALUARE";
            const text = evaluation
              ? `Bună, ${e.name}! Vă scriem legat de evaluarea pentru academia de juniori${e.childFirstName ? ` (${e.childFirstName})` : ""}.`
              : `Bună, ${e.name}! Vă scriem legat de lista de așteptare${e.program ? ` pentru ${t(e.program.name, "ro")}` : ""}.`;
            const mail = mailLink(e.email);
            const tel = telLink(e.phone);
            const wa = whatsappLink(e.phone, text);
            return (
              <article key={e.id} className="admin-row">
                <div>
                  <p className="admin-row-title">
                    {index + 1}. {e.name}
                    {e.forMinor
                      ? ` · ${e.childFirstName ?? "copil"}${e.childAge ? `, ${e.childAge} ani` : ""}`
                      : ""}
                  </p>
                  <p className="admin-row-meta">
                    <span className="status">
                      {evaluation ? "evaluare juniori" : "listă de așteptare"}
                    </span>{" "}
                    ·{" "}
                    {e.group
                      ? t(e.group.name, "ro")
                      : e.program
                        ? t(e.program.name, "ro")
                        : evaluation
                          ? "grupa se stabilește la evaluare"
                          : "Orice program"}{" "}
                    · trimis{" "}
                    {e.createdAt.toLocaleDateString("ro-RO", { timeZone: settings.timezone })} ·{" "}
                    <span className="status">{LABEL[e.status]}</span>
                  </p>
                  {e.experience ? (
                    <p className="mt-2">
                      <strong className="font-medium">Experiență:</strong> {e.experience}
                    </p>
                  ) : null}
                  <p className="mt-2">
                    <strong className="font-medium">Preferințe:</strong> {e.preferences}
                  </p>
                  {e.message ? (
                    <p className="admin-message mt-1 text-cerneala-2">{e.message}</p>
                  ) : null}
                  <p className="mt-1 text-note">
                    {e.phone} · {e.email}
                  </p>
                </div>
                <div className="admin-row-actions">
                  {tel ? (
                    <a href={tel} className="btn btn-secondary btn-small">
                      Sună
                    </a>
                  ) : null}
                  {wa ? (
                    <a
                      href={wa}
                      className="btn btn-secondary btn-small"
                      target="_blank"
                      rel="noopener"
                    >
                      Scrie pe WhatsApp
                    </a>
                  ) : null}
                  {mail ? (
                    <a href={mail} className="btn btn-secondary btn-small">
                      Trimite email
                    </a>
                  ) : null}
                  {e.status !== "CONTACTAT" ? (
                    <ActionButton
                      action={setWaitlistStatusAction}
                      fields={{ id: e.id, status: "CONTACTAT", back }}
                      label="Marchează contactat"
                    />
                  ) : null}
                  {e.status !== "INSCRIS" ? (
                    <ActionButton
                      action={setWaitlistStatusAction}
                      fields={{ id: e.id, status: "INSCRIS", back }}
                      label="Marchează înscris"
                    />
                  ) : null}
                  {e.status !== "ARHIVAT" ? (
                    <ActionButton
                      action={setWaitlistStatusAction}
                      fields={{ id: e.id, status: "ARHIVAT", back }}
                      label="Arhivează"
                    />
                  ) : null}
                  <ActionButton
                    action={deleteWaitlistAction}
                    fields={{ id: e.id, back }}
                    label="Șterge cererea"
                    variant="danger"
                    confirm="Datele se șterg definitiv."
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
