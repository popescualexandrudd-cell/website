import "server-only";
import { headers } from "next/headers";

/** Client IP: the first X-Forwarded-For hop set by Caddy when TRUST_PROXY is on. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const trustProxy = process.env.TRUST_PROXY !== "false";
  if (trustProxy) {
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
    const real = h.get("x-real-ip");
    if (real) return real;
  }
  return "unknown";
}

export async function getUserAgent(): Promise<string> {
  return (await headers()).get("user-agent")?.slice(0, 300) ?? "";
}

/**
 * Same-origin check for route handlers that change data (Server Actions get this from Next.js).
 * Accepts the request when Origin (or Referer) matches the Host the request was sent to.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin") ?? request.headers.get("referer");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
