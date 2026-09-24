import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getResource } from "@/lib/admin/resources";
import { loadEditorProps } from "@/lib/admin/editor-data";
import { deleteUserAction, setUserRoleAction } from "@/app/actions/admin-settings";
import { ResourceForm } from "@/components/admin/ResourceForm";
import { ActionButton } from "@/components/admin/ActionButton";
import { OkNotice } from "@/components/admin/OkNotice";
import { CreateUserForm, ResetPasswordForm, TestEmailForm } from "@/components/admin/AccountForms";

export const metadata: Metadata = { title: "Setări" };

export default async function SettingsPage({ searchParams }: PageProps<"/admin/setari">) {
  const { user } = await requireAdmin("PROPRIETAR");
  const { ok } = await searchParams;
  const resource = getResource("setari");
  if (!resource) throw new Error("Resursa de setări lipsește.");
  const [row, users] = await Promise.all([
    db.siteSettings.findUniqueOrThrow({ where: { id: 1 } }),
    db.adminUser.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  const editor = await loadEditorProps(resource, row);

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-title">Setări</h1>
          <p>{resource.description}</p>
        </div>
      </div>
      <OkNotice
        code={ok}
        messages={{ rol: "Rolul contului e schimbat.", "cont-sters": "Contul a fost șters." }}
      />
      <nav aria-label="Pe această pagină" className="mb-6 flex flex-wrap gap-2 text-note">
        <a href="#site" className="link">
          Site și rezervări
        </a>
        <a href="#email" className="link">
          Email de test
        </a>
        <a href="#conturi" className="link">
          Conturi
        </a>
      </nav>

      <section id="site" aria-label="Site și rezervări">
        <ResourceForm
          resourceKey={resource.key}
          id={String(row.id)}
          singular={resource.singular}
          addLabel=""
          fields={editor.fields}
          values={editor.values}
          media={editor.media}
          relations={editor.relations}
          art={editor.art}
          canDelete={false}
          previewHref="/"
        />
      </section>

      <section id="email" className="admin-section">
        <h2 className="admin-h2">Email de test</h2>
        <p className="mb-3 max-w-prose text-note text-cerneala-2">
          Verifică dacă emailurile către clienți pleacă. Dacă testul nu reușește, clienții nu
          primesc confirmările; setările SMTP sunt în fișierul .env de pe server.
        </p>
        <TestEmailForm defaultTo={row.email.includes("@") ? row.email : user.email} />
      </section>

      <section id="conturi" className="admin-section">
        <h2 className="admin-h2">Conturi de administrare</h2>
        <p className="mb-3 max-w-prose text-note text-cerneala-2">
          Proprietarul vede tot. Editorul (de exemplu cine te ajută cu textele) vede doar Conținut
          și Media, fără rezervări și date de clienți.
        </p>
        <div className="admin-rows mb-6">
          {users.map((u) => (
            <div key={u.id} className="admin-row">
              <div>
                <p className="admin-row-title">
                  {u.name}
                  {u.id === user.id ? " (tu)" : ""}
                </p>
                <p className="admin-row-meta">
                  {u.email} · {u.role === "PROPRIETAR" ? "proprietar" : "editor"} · ultima
                  autentificare:{" "}
                  {u.lastLoginAt
                    ? u.lastLoginAt.toLocaleString("ro-RO", {
                        timeZone: row.timezone,
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "niciodată"}
                  {u.lockedUntil && u.lockedUntil > new Date()
                    ? " · blocat temporar după parole greșite"
                    : ""}
                </p>
              </div>
              {u.id !== user.id ? (
                <div className="admin-row-actions">
                  <ActionButton
                    action={setUserRoleAction}
                    fields={{
                      id: u.id,
                      role: u.role === "PROPRIETAR" ? "EDITOR" : "PROPRIETAR",
                      back: "/admin/setari",
                    }}
                    label={u.role === "PROPRIETAR" ? "Fă-l editor" : "Fă-l proprietar"}
                  />
                  <ResetPasswordForm id={u.id} />
                  <ActionButton
                    action={deleteUserAction}
                    fields={{ id: u.id, back: "/admin/setari" }}
                    label="Șterge contul"
                    variant="danger"
                    confirm="Persoana nu se mai poate autentifica."
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <CreateUserForm />
      </section>
    </>
  );
}
