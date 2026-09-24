import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { mailLink, telLink, whatsappLink } from "@/lib/format";
import { deleteMessageAction, setMessageStatusAction } from "@/app/actions/admin-inbox";
import { ActionButton } from "@/components/admin/ActionButton";
import { StatusTabs } from "@/components/admin/StatusTabs";
import { OkNotice } from "@/components/admin/OkNotice";
import { currentPath } from "@/lib/admin/redirect";
import type { MessageStatus } from "@/lib/generated/prisma/client";

export const metadata: Metadata = { title: "Mesaje" };

const LABEL: Record<MessageStatus, string> = { NOU: "nou", CITIT: "citit", ARHIVAT: "arhivat" };

export default async function MessagesPage({ searchParams }: PageProps<"/admin/mesaje">) {
  await requireAdmin("PROPRIETAR");
  const params = await searchParams;
  const back = currentPath("/admin/mesaje", params);
  const raw = params.stare;
  const status: MessageStatus | "" =
    raw === "CITIT" || raw === "ARHIVAT" ? raw : raw === "toate" ? "" : "NOU";
  const settings = await db.siteSettings.findUniqueOrThrow({
    where: { id: 1 },
    select: { timezone: true },
  });
  const [messages, counts] = await Promise.all([
    db.contactMessage.findMany({
      where: { anonymizedAt: null, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.contactMessage.groupBy({ by: ["status"], _count: true, where: { anonymizedAt: null } }),
  ]);
  const count = (s: MessageStatus) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-title">Mesaje</h1>
          <p>Mesajele trimise din formularul de contact.</p>
        </div>
      </div>
      <OkNotice
        code={params.ok}
        messages={{
          citit: "Mesajul e marcat citit.",
          arhivat: "Mesajul e arhivat.",
          nou: "Mesajul e marcat nou.",
          sters: "Mesajul a fost șters.",
        }}
      />
      <StatusTabs
        base="/admin/mesaje"
        current={raw === "toate" ? "toate" : status || "NOU"}
        tabs={[
          { value: "NOU", label: "Noi", count: count("NOU") },
          { value: "CITIT", label: "Citite", count: count("CITIT") },
          { value: "ARHIVAT", label: "Arhivate", count: count("ARHIVAT") },
          { value: "toate", label: "Toate" },
        ]}
      />
      {messages.length === 0 ? (
        <p className="text-cerneala-2">Niciun mesaj aici.</p>
      ) : (
        <div className="admin-rows">
          {messages.map((m) => {
            const reply = `Bună, ${m.name}! Mulțumesc pentru mesaj.`;
            const mail = mailLink(m.email);
            const tel = telLink(m.phone);
            const wa = whatsappLink(m.phone, reply);
            return (
              <article key={m.id} className="admin-row">
                <details open={m.status === "NOU"}>
                  <summary className="cursor-pointer">
                    <span className="admin-row-title">{m.subject || "Mesaj"}</span> · {m.name}
                    <span className="admin-row-meta block">
                      {m.createdAt.toLocaleString("ro-RO", {
                        timeZone: settings.timezone,
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}{" "}
                      · <span className="status">{LABEL[m.status]}</span>
                    </span>
                  </summary>
                  <p className="admin-message mt-3">{m.message}</p>
                  <dl className="admin-kv mt-3 text-note">
                    <dt>Email</dt>
                    <dd>{m.email}</dd>
                    <dt>Telefon</dt>
                    <dd>{m.phone ?? "—"}</dd>
                    <dt>Acord GDPR</dt>
                    <dd>
                      {m.consentAt.toLocaleString("ro-RO", { timeZone: settings.timezone })} ·
                      politica {m.policyVersion}
                    </dd>
                  </dl>
                  <div className="admin-row-actions mt-3">
                    {mail ? (
                      <a
                        href={`${mail}?subject=${encodeURIComponent(`Re: ${m.subject || "mesajul tău"}`)}`}
                        className="btn btn-primary btn-small"
                      >
                        Răspunde pe email
                      </a>
                    ) : null}
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
                    {m.status !== "CITIT" ? (
                      <ActionButton
                        action={setMessageStatusAction}
                        fields={{ id: m.id, status: "CITIT", back }}
                        label="Marchează citit"
                      />
                    ) : null}
                    {m.status !== "ARHIVAT" ? (
                      <ActionButton
                        action={setMessageStatusAction}
                        fields={{ id: m.id, status: "ARHIVAT", back }}
                        label="Arhivează"
                      />
                    ) : null}
                    <ActionButton
                      action={deleteMessageAction}
                      fields={{ id: m.id, back }}
                      label="Șterge mesajul"
                      variant="danger"
                      confirm="Mesajul se șterge definitiv."
                    />
                  </div>
                </details>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
