import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { delegate, getResource, rowHasTodo } from "@/lib/admin/resources";
import { SortableList, type SortableRow } from "@/components/admin/SortableList";

export async function generateMetadata({
  params,
}: PageProps<"/admin/continut/[resource]">): Promise<Metadata> {
  const resource = getResource((await params).resource);
  return { title: resource?.label ?? "Conținut" };
}

export default async function ResourceListPage({
  params,
  searchParams,
}: PageProps<"/admin/continut/[resource]">) {
  const resource = getResource((await params).resource);
  if (!resource) notFound();
  await requireAdmin(resource.ownerOnly ? "PROPRIETAR" : "EDITOR");
  if (resource.singletonId) redirect(`/admin/continut/${resource.key}/${resource.singletonId}`);
  const deleted = (await searchParams).sters === "1";

  const rows = await delegate(resource.model).findMany({ orderBy: resource.listOrderBy });
  const items: SortableRow[] = rows.map((row) => ({
    id: String(row.id),
    title: resource.title(row) || "(fără titlu)",
    meta: resource.meta?.(row) ?? "",
    flags: [...(resource.flags?.(row) ?? []), ...(rowHasTodo(row) ? ["de completat"] : [])],
    href: `/admin/continut/${resource.key}/${String(row.id)}`,
  }));

  return (
    <>
      <p className="mb-2 text-note">
        <Link href="/admin/continut" className="link">
          Tot conținutul
        </Link>
      </p>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-title">{resource.label}</h1>
          <p>{resource.description}</p>
        </div>
        {resource.canCreate ? (
          <Link href={`/admin/continut/${resource.key}/nou`} className="btn btn-primary btn-small">
            {resource.addLabel}
          </Link>
        ) : null}
      </div>
      {deleted ? <p className="admin-ok mb-4">Elementul a fost șters.</p> : null}
      {items.length === 0 ? (
        <p className="text-cerneala-2">Lista e goală.</p>
      ) : resource.orderable ? (
        <>
          <p className="mb-3 text-note text-cerneala-2">
            Ordinea de aici este ordinea de pe site. Trage de mâner sau folosește săgețile ca să
            schimbi ordinea; se salvează imediat.
          </p>
          <SortableList resourceKey={resource.key} rows={items} />
        </>
      ) : (
        <div className="admin-rows">
          {items.map((item) => (
            <div key={item.id} className="admin-row">
              <Link href={item.href} className="admin-row-link">
                <span className="admin-row-title">{item.title}</span>
                <span className="admin-row-meta block">
                  {item.meta}
                  {item.flags.map((flag) => (
                    <span key={flag} className="status ml-2">
                      {flag}
                    </span>
                  ))}
                </span>
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
