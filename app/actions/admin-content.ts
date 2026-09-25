"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit, diffOf } from "@/lib/audit";
import { renderMarkdown } from "@/lib/markdown";
import {
  delegate,
  getResource,
  visibleFields,
  type Resource,
  type Row,
} from "@/lib/admin/resources";
import { parseForm } from "@/lib/admin/form-values";
import { Prisma } from "@/lib/generated/prisma/client";
import type { FormState } from "@/lib/validation";

async function authorize(resource: Resource) {
  return requireAdmin(resource.ownerOnly ? "PROPRIETAR" : "EDITOR");
}

function refreshSite(resource: Resource) {
  revalidatePath("/", "layout");
  revalidatePath(`/admin/continut/${resource.key}`);
}

function uniqueViolation(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = (error.meta as { target?: unknown } | undefined)?.target;
    return Array.isArray(target)
      ? String(target[0] ?? "")
      : typeof target === "string"
        ? target
        : "slug";
  }
  return null;
}

function plain(row: Row): Record<string, unknown> {
  return JSON.parse(JSON.stringify(row)) as Record<string, unknown>;
}

export async function saveContentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const resource = getResource(String(formData.get("_resource") ?? ""));
  if (!resource) return { status: "error", error: "Secțiune necunoscută." };
  const { user } = await authorize(resource);
  const rawId = String(formData.get("_id") ?? "");
  const id: string | number | null = resource.singletonId ?? (rawId || null);
  if (!id && !resource.canCreate)
    return { status: "error", error: "Aici nu se pot adăuga elemente noi." };

  const model = delegate(resource.model);
  const before = id ? await model.findUnique({ where: { id } }) : null;
  if (id && !before)
    return {
      status: "error",
      error: "Elementul nu mai există (poate a fost șters între timp). Întoarce-te la listă.",
    };

  const settings = await db.siteSettings.findUniqueOrThrow({
    where: { id: 1 },
    select: { timezone: true },
  });
  const { data, errors } = parseForm(visibleFields(resource, before), formData, settings.timezone);
  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      fieldErrors: errors,
      error: "Unele câmpuri nu sunt completate corect. Le-am marcat mai jos.",
    };
  }
  const problem = resource.prepare?.(data, before) ?? null;
  if (problem) return { status: "error", error: problem };

  let saved: Row;
  try {
    if (before) {
      saved = await model.update({ where: { id: before.id }, data });
    } else {
      if (resource.orderable) {
        const last = await model.findMany({
          orderBy: { order: "desc" },
          take: 1,
          select: { order: true },
        });
        data.order = typeof last[0]?.order === "number" ? last[0].order + 1 : 0;
      }
      saved = await model.create({ data });
    }
  } catch (error) {
    const field = uniqueViolation(error);
    if (field) {
      return {
        status: "error",
        fieldErrors: { [field]: "Această adresă este deja folosită de alt element. Alege alta." },
        error: "Unele câmpuri nu sunt completate corect. Le-am marcat mai jos.",
      };
    }
    throw error;
  }

  await resource.afterSave?.(saved);
  await audit(
    user.id,
    before ? "continut.modificare" : "continut.creare",
    resource.entity,
    String(saved.id),
    diffOf(before ? plain(before) : null, plain(saved)),
  );
  refreshSite(resource);
  if (!before) redirect(`/admin/continut/${resource.key}/${String(saved.id)}?salvat=1`);
  return { status: "success" };
}

export async function deleteContentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const resource = getResource(String(formData.get("_resource") ?? ""));
  if (!resource || !resource.canDelete)
    return { status: "error", error: "Acest element nu se poate șterge." };
  const { user } = await authorize(resource);
  const id = String(formData.get("_id") ?? "");
  const model = delegate(resource.model);
  const row = await model.findUnique({ where: { id } });
  if (!row) redirect(`/admin/continut/${resource.key}`);
  const blocked = await resource.deleteBlocked?.(row);
  if (blocked) return { status: "error", error: blocked };
  await model.delete({ where: { id } });
  await audit(user.id, "continut.stergere", resource.entity, id, diffOf(plain(row), null));
  refreshSite(resource);
  redirect(`/admin/continut/${resource.key}?sters=1`);
}

export async function reorderContentAction(
  resourceKey: string,
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  const resource = getResource(resourceKey);
  if (!resource?.orderable)
    return { ok: false, error: "Ordinea acestei liste nu se poate schimba." };
  const { user } = await authorize(resource);
  if (
    !Array.isArray(ids) ||
    ids.length > 500 ||
    ids.some((id) => typeof id !== "string" || id.length > 40)
  ) {
    return { ok: false, error: "Lista trimisă nu este validă. Reîncarcă pagina." };
  }
  await db.$transaction(async (tx) => {
    const model = delegate(resource.model, tx);
    for (const [index, id] of ids.entries()) {
      await model.update({ where: { id }, data: { order: index } });
    }
  });
  await audit(user.id, "continut.ordine", resource.entity, null, { ids });
  refreshSite(resource);
  return { ok: true };
}

/** Renders Markdown exactly as the site does, for the editor's preview tab. */
export async function previewMarkdownAction(source: string): Promise<string> {
  await requireAdmin();
  return renderMarkdown(String(source).slice(0, 60_000));
}
