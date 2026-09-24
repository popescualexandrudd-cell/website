import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";
import { Monogram } from "@/components/site/Monogram";

export const metadata: Metadata = { title: "Autentificare" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await getAdminSession()) redirect("/admin");
  const next = (await searchParams).next;
  return (
    <main className="admin-login">
      <div className="admin-login-card">
        <Monogram letters="" className="size-12" />
        <h1 className="admin-title mt-4">Administrare</h1>
        <p className="mb-6 text-cerneala-2">Intră ca să vezi rezervările și să editezi site-ul.</p>
        <LoginForm next={typeof next === "string" ? next : undefined} />
      </div>
    </main>
  );
}
