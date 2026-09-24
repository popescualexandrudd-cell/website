import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";
import { mediaFilePath } from "@/lib/admin/media";

const TYPES: Record<string, string> = { ".avif": "image/avif", ".webp": "image/webp" };

/**
 * Serves uploaded images from MEDIA_DIR. In production Caddy serves /media directly from the
 * same volume; this route keeps development (and a setup without Caddy) working.
 */
export async function GET(_request: Request, ctx: RouteContext<"/media/[...path]">) {
  const { path } = await ctx.params;
  const file = mediaFilePath(path);
  const type = TYPES[extname(path.at(-1) ?? "")];
  if (!file || !type) return new Response("Not found", { status: 404 });
  try {
    const info = await stat(file);
    if (!info.isFile()) return new Response("Not found", { status: 404 });
    const body = await readFile(file);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
