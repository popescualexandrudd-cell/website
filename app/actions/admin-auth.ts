"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  login,
  logout,
  requireAdmin,
  hashPassword,
  verifyPassword,
  passwordProblem,
} from "@/lib/auth";
import { getClientIp, getUserAgent } from "@/lib/request";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import type { FormState } from "@/lib/validation";

const loginSchema = z.object({
  email: z.string().trim().min(3).max(200),
  password: z.string().min(1).max(200),
});

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { status: "error", error: "invalid" };
  const result = await login(parsed.data.email, parsed.data.password, {
    ip: await getClientIp(),
    userAgent: await getUserAgent(),
  });
  if (!result.ok) return { status: "error", error: result.error };
  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
}

export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/admin/login");
}

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user, sessionId } = await requireAdmin();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const repeat = String(formData.get("repeat") ?? "");
  const account = await db.adminUser.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(account.passwordHash, current)))
    return { status: "error", fieldErrors: { current: "Parola actuală nu este corectă." } };
  const problem = passwordProblem(next);
  if (problem) return { status: "error", fieldErrors: { next: problem } };
  if (next !== repeat)
    return { status: "error", fieldErrors: { repeat: "Parolele noi nu coincid." } };
  await db.adminUser.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next) },
  });
  // Every other device is signed out; this one stays signed in.
  await db.session.deleteMany({ where: { userId: user.id, id: { not: sessionId } } });
  await audit(user.id, "parola.schimbata", "AdminUser", user.id);
  return { status: "success" };
}
