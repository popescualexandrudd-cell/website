import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { ChangePasswordForm, LogoutEverywhereForm } from "@/components/admin/AccountForms";

export const metadata: Metadata = { title: "Contul meu" };

export default async function AccountPage() {
  const { user } = await requireAdmin();
  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-title">Contul meu</h1>
          <p>
            {user.name} · {user.email} · {user.role === "PROPRIETAR" ? "proprietar" : "editor"}
          </p>
        </div>
      </div>
      <section className="admin-section">
        <h2 className="admin-h2">Schimbă parola</h2>
        <ChangePasswordForm />
      </section>
      <section className="admin-section">
        <h2 className="admin-h2">Dispozitive</h2>
        <p className="mb-3 max-w-prose text-note text-cerneala-2">
          Rămâi autentificat 30 de zile pe fiecare dispozitiv. Dacă ți-ai pierdut telefonul sau
          te-ai autentificat pe un calculator străin, deconectează celelalte dispozitive.
        </p>
        <LogoutEverywhereForm />
      </section>
    </>
  );
}
