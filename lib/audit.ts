import "server-only";
import { db } from "./db";
import { Prisma } from "./generated/prisma/client";

const SENSITIVE = new Set(["passwordHash", "cancelTokenHash", "reviewTokenHash", "password"]);

function scrub(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => !SENSITIVE.has(k))
        .map(([k, v]) => [k, scrub(v)]),
    );
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  return value;
}

/** Records who did what; only the fields that changed are stored, secrets never. */
export function diffOf(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!before || !after)
    return { before: scrub(before), after: scrub(after) } as Record<string, unknown>;
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(after)) {
    if (SENSITIVE.has(key) || key === "updatedAt") continue;
    const a = JSON.stringify(scrub(before[key]));
    const b = JSON.stringify(scrub(after[key]));
    if (a !== b) changes[key] = { from: scrub(before[key]), to: scrub(after[key]) };
  }
  return changes;
}

export async function audit(
  userId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  diff?: Record<string, unknown>,
) {
  await db.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      diff: diff ? (JSON.parse(JSON.stringify(diff)) as Prisma.InputJsonValue) : Prisma.DbNull,
    },
  });
}
