import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** 32 random bytes, URL-safe. Only the SHA-256 hash is ever stored. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Short public booking code, e.g. "TN-7K3Q2P" (no easily confused characters). */
export function generateBookingCode(): string {
  const bytes = randomBytes(6);
  let code = "";
  for (const byte of bytes) code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return `TN-${code}`;
}

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET lipsește sau e prea scurt.");
  return value;
}

/** HMAC-signed, expiring payload for links in emails (e.g. the coach's confirm / decline buttons). */
export function signPayload(payload: Record<string, string | number>, ttlSeconds: number): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyPayload(token: string): Record<string, string | number> | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Record<
      string,
      string | number
    >;
    if (typeof data.exp !== "number" || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Deterministic token for a record (e.g. a booking's manage link). It can be rebuilt for every
 * email from the record id and AUTH_SECRET, while the database stores only its SHA-256 hash.
 */
export function deriveToken(purpose: string, id: string): string {
  return createHmac("sha256", secret()).update(`${purpose}:${id}`).digest("base64url");
}
