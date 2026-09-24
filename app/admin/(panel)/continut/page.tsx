import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { RESOURCES, delegate, rowHasTodo } from "@/lib/admin/resources";
import { countLabel } from "@/lib/admin/format";

export const metadata: Metadata = { title: "Conținut" };

export default async function ContentIndexPage() {
  await requireAdmin();
  const resources = RESOURCES.filter((r) => !r.ownerOnly);
  const stats = await Promise.all(
    resources.map(async (r) => {
      const rows = await delegate(r.model).findMany();
      return { key: r.key, count: rows.length, todo: rows.filter(rowHasTodo).length };
    }),
  );
  const sections = [...new Set(resources.map((r) => r.section))];

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-title">Conținut</h1>
          <p>
            Textele, imaginile și listele de pe site. Modificările apar pe site imediat după
            salvare.
          </p>
        </div>
        <a
          href="/api/preview/enable?redirect=/"
          target="_blank"
          rel="noopener"
          className="btn btn-secondary btn-small"
        >
          Previzualizează site-ul cu ciornele
        </a>
      </div>
      {sections.map((section) => (
        <section key={section} className="admin-section">
          <h2 className="admin-h2">{section}</h2>
          <div className="admin-rows">
            {resources
              .filter((r) => r.section === section)
              .map((r) => {
                const stat = stats.find((s) => s.key === r.key);
                const href = r.singletonId
                  ? `/admin/continut/${r.key}/${r.singletonId}`
                  : `/admin/continut/${r.key}`;
                return (
                  <div key={r.key} className="admin-row">
                    <Link href={href} className="admin-row-link">
                      <span className="admin-row-title">{r.label}</span>
                      <span className="admin-row-meta block">{r.description}</span>
                    </Link>
                    <span className="admin-row-meta">
                      {r.singletonId ? "" : countLabel(stat?.count ?? 0, "element", "elemente")}
                      {stat && stat.todo > 0 ? (
                        <span className="status status--IN_ASTEPTARE ml-2">
                          {stat.todo} de completat
                        </span>
                      ) : null}
                    </span>
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </>
  );
}
