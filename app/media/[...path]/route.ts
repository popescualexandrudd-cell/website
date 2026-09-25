import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname } from "node:path";
import { Readable } from "node:stream";
import { mediaFilePath } from "@/lib/admin/media";
import { parseRange } from "@/lib/range";

const TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
};

const BASE_HEADERS = {
  "Cache-Control": "public, max-age=31536000, immutable",
  "X-Content-Type-Options": "nosniff",
  "Accept-Ranges": "bytes",
};

function stream(file: string, start?: number, end?: number): ReadableStream {
  return Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
}

/**
 * Serves uploaded images and videos from MEDIA_DIR. In production Caddy serves /media directly
 * from the same volume; this route keeps development (and a setup without Caddy) working.
 * Videos are streamed with byte ranges, which Safari needs to play them and every browser
 * uses to seek.
 */
export async function GET(request: Request, ctx: RouteContext<"/media/[...path]">) {
  const { path } = await ctx.params;
  const file = mediaFilePath(path);
  const type = TYPES[extname(path.at(-1) ?? "")];
  if (!file || !type) return new Response("Not found", { status: 404 });
  try {
    const info = await stat(file);
    if (!info.isFile()) return new Response("Not found", { status: 404 });
    const rangeHeader = request.headers.get("range");
    if (rangeHeader) {
      const range = parseRange(rangeHeader, info.size);
      if (!range)
        return new Response(null, {
          status: 416,
          headers: { ...BASE_HEADERS, "Content-Range": `bytes */${info.size}` },
        });
      const [start, end] = range;
      return new Response(stream(file, start, end), {
        status: 206,
        headers: {
          ...BASE_HEADERS,
          "Content-Type": type,
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${info.size}`,
        },
      });
    }
    return new Response(stream(file), {
      headers: { ...BASE_HEADERS, "Content-Type": type, "Content-Length": String(info.size) },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
