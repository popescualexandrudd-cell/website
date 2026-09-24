import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { delegate, getResource } from "@/lib/admin/resources";
import { loadEditorProps } from "@/lib/admin/editor-data";
import { ResourceForm } from "@/components/admin/ResourceForm";

export async function generateMetadata({
  params,
}: PageProps<"/admin/continut/[resource]/[id]">): Promise<Metadata> {
  const resource = getResource((await params).resource);
  return { title: resource ? `Editează ${resource.singular}` : "Conținut" };
}

export default async function ResourceEditPage({
  params,
  searchParams,
}: PageProps<"/admin/continut/[resource]/[id]">) {
  const { resource: key, id } = await params;
  const resource = getResource(key);
  if (!resource) notFound();
  await requireAdmin(resource.ownerOnly ? "PROPRIETAR" : "EDITOR");
  const isNew = id === "nou";
  if (isNew && !resource.canCreate) notFound();
  const rowId = resource.singletonId ?? id;
  const row = isNew ? null : await delegate(resource.model).findUnique({ where: { id: rowId } });
  if (!isNew && !row) notFound();
  const saved = (await searchParams).salvat === "1";
  const editor = await loadEditorProps(resource, row);
  const title = row ? resource.title(row) : (resource.newTitle ?? "Element nou");

  return (
    <>
      <p className="mb-2 text-note">
        <Link
          href={resource.singletonId ? "/admin/continut" : `/admin/continut/${resource.key}`}
          className="link"
        >
          {resource.singletonId ? "Tot conținutul" : resource.label}
        </Link>
      </p>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-title">{title || "(fără titlu)"}</h1>
          <p>{resource.description}</p>
        </div>
      </div>
      {saved ? (
        <p className="admin-ok mb-4">Elementul a fost adăugat. Poți continua să-l completezi.</p>
      ) : null}
      <ResourceForm
        resourceKey={resource.key}
        id={row ? String(row.id) : null}
        singular={resource.singular}
        addLabel={resource.addLabel ?? "Adaugă"}
        fields={editor.fields}
        values={editor.values}
        media={editor.media}
        relations={editor.relations}
        canDelete={Boolean(resource.canDelete)}
        previewHref={row ? (resource.publicPath?.(row) ?? null) : null}
      />
    </>
  );
}
