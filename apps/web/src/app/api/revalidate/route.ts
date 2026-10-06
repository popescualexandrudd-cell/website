/**
 * The backend tells the site that a flag or a setting changed (jungle.configuration.web), so the
 * pages are rebuilt at the next visit instead of after 5 minutes. Protected by the secret shared
 * with the backend (REVALIDATE_SECRET, only in the server's .env); without it the route does not
 * exist. Only known cache tags are accepted.
 */
import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

const TAGS = new Set(["flags", "config", "events", "cafe", "blog", "content"]);

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.REVALIDATE_SECRET ?? "";
  if (!secret) return new Response(null, { status: 404 });
  if (!sameSecret(request.headers.get("x-revalidate-secret") ?? "", secret)) {
    return Response.json({ revalidated: false }, { status: 401 });
  }
  let tags: unknown;
  try {
    tags = ((await request.json()) as { tags?: unknown }).tags;
  } catch {
    tags = null;
  }
  if (!Array.isArray(tags) || tags.length === 0 || !tags.every((t) => typeof t === "string" && TAGS.has(t))) {
    return Response.json({ revalidated: false }, { status: 400 });
  }
  // The data is gone at once: the next visit rebuilds the page (no stale page after a launch).
  for (const tag of tags as string[]) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: true, tags });
}
