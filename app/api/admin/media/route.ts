import { adminFromRequest } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/request";
import { MAX_UPLOAD_BYTES, processUpload } from "@/lib/admin/media";

export const dynamic = "force-dynamic";

function reply(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Image upload from the admin (multipart: file, altRo, altEn, treatment). */
export async function POST(request: Request) {
  const session = await adminFromRequest();
  if (!session) return reply(401, { error: "Sesiunea a expirat. Autentifică-te din nou." });
  if (!isSameOrigin(request))
    return reply(403, { error: "Cererea nu vine din panoul de administrare." });
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024)
    return reply(413, {
      error: "Fișierul depășește 10 MB. Micșorează fotografia și încearcă din nou.",
    });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply(400, { error: "Încărcarea nu a reușit. Încearcă din nou." });
  }
  const file = form.get("file");
  const altRo = String(form.get("altRo") ?? "")
    .trim()
    .slice(0, 300);
  const altEn = String(form.get("altEn") ?? "")
    .trim()
    .slice(0, 300);
  if (!(file instanceof File)) return reply(400, { error: "Alege o fotografie." });
  if (altRo.length < 3)
    return reply(400, {
      error:
        "Descrie în câteva cuvinte ce se vede în fotografie (textul alternativ e obligatoriu).",
    });
  if (file.size > MAX_UPLOAD_BYTES)
    return reply(413, {
      error: "Fișierul depășește 10 MB. Micșorează fotografia și încearcă din nou.",
    });

  const result = await processUpload({
    buffer: Buffer.from(await file.arrayBuffer()),
    originalName: file.name,
    alt: altEn ? { ro: altRo, en: altEn } : { ro: altRo },
    treatment: form.get("treatment") === "on",
  });
  if (!result.ok) return reply(400, { error: result.error });
  await audit(session.user.id, "media.incarcare", "Media", result.id, {
    name: file.name.slice(0, 200),
    size: file.size,
  });
  return reply(201, { id: result.id });
}
