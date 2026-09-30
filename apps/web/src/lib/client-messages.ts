/**
 * The texts the browser needs: only those of the client components. Everything else is rendered on
 * the server, so the rest of the catalog (the admin panel, the kiosks, the screens, the server-only
 * sections) never travels with a page. Without this every page carried the whole catalog (91 KB of
 * JSON in the HTML), which slowed the first paint on phones (Lighthouse, §9.4).
 *
 * A client component that reads a new namespace adds it here; `client-messages.test.ts` fails
 * otherwise.
 */
export const CLIENT_NAMESPACES = [
  "errors",
  "web.nav",
  "web.cookies",
  "web.waitlist",
  "web.confirm",
  "web.unsubscribe",
  "web.league",
  "web.site.header",
  "web.site.live",
  "web.site.level",
  "web.site.league",
  "web.site.pilates",
  "web.site.packages",
  "web.site.split",
] as const;

type Tree = { [key: string]: unknown };

const isTree = (value: unknown): value is Tree => typeof value === "object" && value !== null && !Array.isArray(value);

/** A copy of `messages` holding only the given dotted paths (missing paths are skipped). */
export function pickMessages(messages: Tree, paths: readonly string[]): Tree {
  const out: Tree = {};
  for (const path of paths) {
    const keys = path.split(".");
    let source: unknown = messages;
    for (const key of keys) source = isTree(source) ? source[key] : undefined;
    if (source === undefined) continue;
    let target = out;
    for (const key of keys.slice(0, -1)) {
      const next = target[key];
      target = isTree(next) ? next : (target[key] = {}) as Tree;
    }
    target[keys[keys.length - 1] as string] = source;
  }
  return out;
}
