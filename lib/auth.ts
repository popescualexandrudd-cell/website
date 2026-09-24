import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hash, verify } from "@node-rs/argon2";
import { db } from "./db";
import { generateToken, hashToken } from "./tokens";
import { rateLimit } from "./rate-limit";
import type { AdminRole } from "./generated/prisma/client";

export const SESSION_COOKIE = "sesiune_admin";
const SESSION_DAYS = 30;
const RENEW_WHEN_DAYS_LEFT = 15;
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const DAY = 24 * 3_600_000;

/** argon2id with the OWASP-recommended baseline parameters (19 MiB, 2 iterations). */
// algorithm 2 = Argon2id (the package exports it as a const enum, unusable with isolatedModules).
const ARGON_OPTIONS = { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON_OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** A password strong enough for the admin: at least 12 characters, not only letters or only digits. */
export function passwordProblem(password: string): string | null {
  if (password.length < 12) return "Parola trebuie să aibă cel puțin 12 caractere.";
  if (password.length > 200) return "Parola este prea lungă.";
  if (/^[a-zA-ZăâîșțĂÂÎȘȚ]+$/.test(password) || /^\d+$/.test(password)) {
    return "Folosește și cifre sau semne, nu doar litere sau doar cifre.";
  }
  return null;
}

function cookieSecure(): boolean {
  return (
    (process.env.APP_URL ?? "").startsWith("https://") || process.env.NODE_ENV === "production"
  );
}

async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    priority: "high",
  });
}

export type AdminSession = {
  sessionId: string;
  user: { id: string; email: string; name: string; role: AdminRole };
};

/** Reads and validates the session cookie; renews sliding sessions. One lookup per request. */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length < 20 || token.length > 200) return null;
  const id = hashToken(token);
  const session = await db.session.findUnique({ where: { id }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await db.session.delete({ where: { id } }).catch(() => undefined);
    return null;
  }
  if (session.expiresAt.getTime() - Date.now() < RENEW_WHEN_DAYS_LEFT * DAY) {
    const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY);
    await db.session.update({ where: { id }, data: { expiresAt } });
    try {
      await setSessionCookie(token, expiresAt);
    } catch {
      // Cookies are read-only while rendering a page; the renewal is saved and the next action refreshes it.
    }
  }
  const { user } = session;
  return {
    sessionId: id,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
});

/** Every admin page and server action starts here: the check runs on the server, not in the UI. */
export async function requireAdmin(role: AdminRole = "EDITOR"): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (role === "PROPRIETAR" && session.user.role !== "PROPRIETAR") redirect("/admin?interzis=1");
  return session;
}

/** For route handlers: returns null instead of redirecting. */
export async function adminFromRequest(role: AdminRole = "EDITOR"): Promise<AdminSession | null> {
  const session = await getAdminSession();
  if (!session) return null;
  if (role === "PROPRIETAR" && session.user.role !== "PROPRIETAR") return null;
  return session;
}

let dummyHash: Promise<string> | null = null;
function timingDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(generateToken());
  return dummyHash;
}

export type LoginResult = { ok: true } | { ok: false; error: "invalid" | "locked" | "rateLimit" };

/**
 * Checks the password with a fixed amount of work even for unknown emails, locks the account for
 * 15 minutes after 5 wrong attempts, and always issues a brand-new session (no fixation).
 */
export async function login(
  email: string,
  password: string,
  meta: { ip: string; userAgent: string },
): Promise<LoginResult> {
  const normalized = email.trim().toLowerCase();
  const allowedIp = await rateLimit(`login:ip:${meta.ip}`, 20, 15 * 60);
  const allowedEmail = await rateLimit(`login:email:${normalized}`, 10, 15 * 60);
  if (!allowedIp || !allowedEmail) return { ok: false, error: "rateLimit" };

  const user = await db.adminUser.findUnique({ where: { email: normalized } });
  if (!user) {
    // Same amount of work as a real check, so response times do not reveal which emails exist.
    await verifyPassword(await timingDummyHash(), password);
    return { ok: false, error: "invalid" };
  }
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now())
    return { ok: false, error: "locked" };

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    const failed = user.failedLogins + 1;
    await db.adminUser.update({
      where: { id: user.id },
      data: {
        failedLogins: failed >= MAX_FAILED_LOGINS ? 0 : failed,
        lockedUntil:
          failed >= MAX_FAILED_LOGINS
            ? new Date(Date.now() + LOCK_MINUTES * 60_000)
            : user.lockedUntil,
      },
    });
    await db.auditLog.create({
      data: { userId: user.id, action: "login.esuat", entity: "AdminUser", entityId: user.id },
    });
    return { ok: false, error: failed >= MAX_FAILED_LOGINS ? "locked" : "invalid" };
  }

  // Regenerate: drop the session this browser had, then issue a new one.
  const previous = (await cookies()).get(SESSION_COOKIE)?.value;
  if (previous) await db.session.deleteMany({ where: { id: hashToken(previous) } });
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY);
  await db.session.create({
    data: {
      id: hashToken(token),
      userId: user.id,
      expiresAt,
      ip: meta.ip.slice(0, 64),
      userAgent: meta.userAgent.slice(0, 300),
    },
  });
  await db.adminUser.update({
    where: { id: user.id },
    data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await db.auditLog.create({
    data: { userId: user.id, action: "login", entity: "AdminUser", entityId: user.id },
  });
  await setSessionCookie(token, expiresAt);
  return { ok: true };
}

export async function logout(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: hashToken(token) } });
  store.delete(SESSION_COOKIE);
}
