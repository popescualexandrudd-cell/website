"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { mediaUsage, removeMediaFiles, toThumb, type MediaThumb } from "@/lib/admin/media";
import type { FormState } from "@/lib/validation";

/** The library shown in the image picker, newest first. */
export async function listMediaAction(): Promise<MediaThumb[]> {
  await requireAdmin();
  const items = await db.media.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  return items.map(toThumb);
}

export async function updateMediaAltAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const altRo = String(formData.get("altRo") ?? "")
    .trim()
    .slice(0, 300);
  const altEn = String(formData.get("altEn") ?? "")
    .trim()
    .slice(0, 300);
  if (altRo.length < 3)
    return {
      status: "error",
      fieldErrors: { altRo: "Descrie în câteva cuvinte ce se vede în imagine." },
      error: "Textul alternativ e obligatoriu.",
    };
  await db.media.update({
    where: { id },
    data: { alt: altEn ? { ro: altRo, en: altEn } : { ro: altRo } },
  });
  await audit(user.id, "media.descriere", "Media", id);
  revalidatePath("/admin/media");
  return { status: "success" };
}

export async function deleteMediaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const media = await db.media.findUnique({ where: { id } });
  if (!media) redirect("/admin/media");
  const used = await mediaUsage(id);
  if (used > 0) {
    return {
      status: "error",
      error: `${media.kind === "VIDEO" ? "Video-ul e folosit" : "Imaginea e folosită"} în ${used} ${used === 1 ? "loc" : "locuri"} pe site. ${media.kind === "VIDEO" ? "Înlocuiește-l" : "Înlocuiește-o"} acolo înainte să ${media.kind === "VIDEO" ? "îl" : "o"} ștergi.`,
    };
  }
  await db.media.delete({ where: { id } });
  await removeMediaFiles(media);
  await audit(user.id, "media.stergere", "Media", id, { path: media.path });
  revalidatePath("/admin/media");
  redirect("/admin/media?sters=1");
}
