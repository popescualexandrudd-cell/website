import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { countLabel } from "@/lib/admin/format";

export const metadata: Metadata = { title: "Clienți" };

const PAGE_SIZE = 40;

export default async function ClientsPage({ searchParams }: PageProps<"/admin/clienti">) {
  await requireAdmin("PROPRIETAR");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const page = Math.max(
    1,
    Number.parseInt(typeof params.pagina === "string" ? params.pagina : "1", 10) || 1,
  );
  const deleted = params.sters === "1";
  const where: Prisma.ClientWhereInput = {
    anonymizedAt: null,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q.replace(/\s/g, "") } },
          ],
        }
      : {}),
  };
  const [clients, total] = await Promise.all([
    db.client.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { bookings: true } }, activePlan: true },
    }),
    db.client.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-title">Clienți</h1>
          <p>Se creează automat la prima rezervare. {countLabel(total, "client", "clienți")}.</p>
        </div>
      </div>
      {deleted ? (
        <p className="admin-ok mb-4">
          Datele clientului au fost șterse. Rezervările vechi rămân doar ca statistică, anonimizate.
        </p>
      ) : null}
      <form className="mb-4 flex flex-wrap items-end gap-3" role="search">
        <label className="field min-w-64 flex-1">
          <span className="field-label">Caută după nume, email sau telefon</span>
          <input type="search" name="q" defaultValue={q} className="input" />
        </label>
        <button type="submit" className="btn btn-secondary">
          Caută
        </button>
      </form>
      {clients.length === 0 ? (
        <p className="text-cerneala-2">{q ? "Niciun client găsit." : "Niciun client încă."}</p>
      ) : (
        <div className="admin-rows">
          {clients.map((c) => (
            <div key={c.id} className="admin-row">
              <Link href={`/admin/clienti/${c.id}`} className="admin-row-link">
                <span className="admin-row-title">{c.name}</span>
                <span className="admin-row-meta block">
                  {[c.phone, c.email].filter(Boolean).join(" · ") || "fără contact"} ·{" "}
                  {countLabel(c._count.bookings, "rezervare", "rezervări")}
                  {c.sessionsRemaining !== null
                    ? ` · ${countLabel(c.sessionsRemaining, "antrenament rămas", "antrenamente rămase")} în pachet`
                    : ""}
                </span>
              </Link>
            </div>
          ))}
        </div>
      )}
      {pages > 1 ? (
        <nav aria-label="Pagini" className="mt-4 flex gap-3">
          {page > 1 ? (
            <Link
              href={`/admin/clienti?q=${encodeURIComponent(q)}&pagina=${page - 1}`}
              className="btn btn-secondary btn-small"
            >
              Pagina anterioară
            </Link>
          ) : null}
          <span className="self-center text-note">
            Pagina {page} din {pages}
          </span>
          {page < pages ? (
            <Link
              href={`/admin/clienti?q=${encodeURIComponent(q)}&pagina=${page + 1}`}
              className="btn btn-secondary btn-small"
            >
              Pagina următoare
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
