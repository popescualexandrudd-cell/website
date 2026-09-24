"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hashPassword, passwordProblem, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { deliverEmail } from "@/lib/email/send";
import { queueTestEmail } from "@/lib/email/messages";
import { backWith } from "@/lib/admin/redirect";
import type { FormState } from "@/lib/validation";

export async function sendTestEmailAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requireAdmin("PROPRIETAR");
  const to = String(formData.get("to") ?? "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to))
    return { status: "error", error: "Scrie o adresă de email validă." };
  const [id] = await queueTestEmail(to);
  const sent = id ? await deliverEmail(id) : false;
  await audit(user.id, "email.test", "EmailLog", id ?? null, { to, sent });
  if (!sent) {
    const log = id
      ? await db.emailLog.findUnique({ where: { id }, select: { error: true } })
      : null;
    return {
      status: "error",
      error: `Emailul nu a putut fi trimis${log?.error ? ` (${log.error.slice(0, 160)})` : ""}. Verifică setările SMTP din fișierul .env de pe server (vezi DEPLOY.md).`,
    };
  }
  return { status: "success", data: { to } };
}

const userSchema = z.object({
  name: z.string().trim().min(2, "Scrie numele.").max(120),
  email: z.string().trim().toLowerCase().max(200).email("Adresa de email nu pare corectă."),
  role: z.enum(["PROPRIETAR", "EDITOR"]),
  password: z.string().max(200),
});

export async function createUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireAdmin("PROPRIETAR");
  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { status: "error", fieldErrors, error: "Unele câmpuri nu sunt completate corect." };
  }
  const problem = passwordProblem(parsed.data.password);
  if (problem)
    return {
      status: "error",
      fieldErrors: { password: problem },
      error: "Parola nu e destul de sigură.",
    };
  const exists = await db.adminUser.findUnique({ where: { email: parsed.data.email } });
  if (exists)
    return {
      status: "error",
      fieldErrors: { email: "Există deja un cont cu această adresă." },
      error: "Contul există deja.",
    };
  const created = await db.adminUser.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });
  await audit(user.id, "utilizator.creare", "AdminUser", created.id, {
    email: created.email,
    role: created.role,
  });
  revalidatePath("/admin/setari");
  return { status: "success" };
}

async function ownersLeftWithout(userId: string): Promise<number> {
  return db.adminUser.count({ where: { role: "PROPRIETAR", id: { not: userId } } });
}

export async function setUserRoleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireAdmin("PROPRIETAR");
  const id = String(formData.get("id") ?? "");
  const role = formData.get("role") === "PROPRIETAR" ? "PROPRIETAR" : "EDITOR";
  if (role === "EDITOR" && (await ownersLeftWithout(id)) === 0) {
    return { status: "error", error: "Trebuie să rămână cel puțin un cont de proprietar." };
  }
  await db.adminUser.update({ where: { id }, data: { role } });
  await audit(user.id, "utilizator.rol", "AdminUser", id, { role });
  revalidatePath("/admin/setari");
  backWith(formData, "/admin/setari", "rol");
}

export async function resetUserPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requireAdmin("PROPRIETAR");
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  const problem = passwordProblem(password);
  if (problem) return { status: "error", error: problem };
  await db.adminUser.update({
    where: { id },
    data: { passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null },
  });
  await db.session.deleteMany({ where: { userId: id } });
  await audit(user.id, "utilizator.parola-resetata", "AdminUser", id);
  return { status: "success" };
}

export async function deleteUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireAdmin("PROPRIETAR");
  const id = String(formData.get("id") ?? "");
  if (id === user.id) return { status: "error", error: "Nu îți poți șterge propriul cont." };
  const target = await db.adminUser.findUnique({ where: { id } });
  if (!target) backWith(formData, "/admin/setari", "cont-sters");
  if (target.role === "PROPRIETAR" && (await ownersLeftWithout(id)) === 0) {
    return { status: "error", error: "Trebuie să rămână cel puțin un cont de proprietar." };
  }
  await db.adminUser.delete({ where: { id } });
  await audit(user.id, "utilizator.stergere", "AdminUser", id, { email: target.email });
  revalidatePath("/admin/setari");
  backWith(formData, "/admin/setari", "cont-sters");
}

/** Signs out every other device (for a lost phone, for example). */
export async function logoutEverywhereAction(
  _prev: FormState,
  _formData: FormData,
): Promise<FormState> {
  const { user, sessionId } = await requireAdmin();
  const removed = await db.session.deleteMany({
    where: { userId: user.id, id: { not: sessionId } },
  });
  await audit(user.id, "sesiuni.inchise", "AdminUser", user.id, { count: removed.count });
  return { status: "success", data: { count: String(removed.count) } };
}
