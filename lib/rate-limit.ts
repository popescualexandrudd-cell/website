import "server-only";
import { db } from "./db";

/**
 * Fixed-window rate limit stored in Postgres, shared by every app process.
 * Returns true when the action is allowed (and counts it).
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / (windowSeconds * 1000)) * windowSeconds * 1000);
  const expiresAt = new Date(windowStart.getTime() + windowSeconds * 1000);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart", "expiresAt", "createdAt", "updatedAt")
    VALUES (${key}, 1, ${windowStart}, ${expiresAt}, ${now}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" = EXCLUDED."windowStart" THEN "RateLimit"."count" + 1 ELSE 1 END,
      "windowStart" = EXCLUDED."windowStart",
      "expiresAt" = EXCLUDED."expiresAt",
      "updatedAt" = EXCLUDED."updatedAt"
    RETURNING "count"`;
  const count = Number(rows[0]?.count ?? 0);
  return count <= limit;
}

/** Limits a public form by IP and, when given, by email address. */
export async function allowFormSubmission(form: string, ip: string, email?: string): Promise<boolean> {
  const byIp = await rateLimit(`form:${form}:ip:${ip}`, 8, 15 * 60);
  if (!byIp) return false;
  if (email) {
    const byEmail = await rateLimit(`form:${form}:email:${email.toLowerCase()}`, 5, 60 * 60);
    if (!byEmail) return false;
  }
  return true;
}
