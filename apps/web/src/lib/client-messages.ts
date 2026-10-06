/**
 * The texts the browser needs: only those of the client components. Everything else is rendered on
 * the server, so the rest of the catalog (the admin panel, the kiosks, the screens, the server-only
 * sections) never travels with a page. Without this every page carried the whole catalog (91 KB of
 * JSON in the HTML), which slowed the first paint on phones (Lighthouse, §9.4).
 *
 * A client component that reads a new namespace adds it here; `client-messages.test.ts` fails
 * otherwise.
 */
/** Every page: the headers, the cookie choice. Given by the layout. */
export const SHELL_NAMESPACES = ["web.nav", "web.cookies", "web.site.header"] as const;
/** The pre-launch page (Stage 1B): the waitlist form and the league card. */
export const PRELAUNCH_NAMESPACES = ["errors", "web.waitlist", "web.league"] as const;
/** The waitlist confirm and unsubscribe pages. */
export const TOKEN_NAMESPACES = ["errors", "web.confirm", "web.unsubscribe"] as const;
/** The home page of the full site: its live data and simulators. */
export const FULL_HOME_NAMESPACES = [
  "web.site.live",
  "web.site.level",
  "web.site.league",
  "web.site.pilates",
  "web.site.packages",
  "web.site.split",
] as const;

/** The account's pages: their forms and the translated API errors. */
export const ACCOUNT_NAMESPACES = ["errors", "web.account"] as const;
/** The bookings page: the court picker, its texts and the account's (sign-in state, errors). */
export const BOOKING_NAMESPACES = ["errors", "web.account", "web.bookings"] as const;
/** The club's assistant (Stage 12D), on every page of the full site when the AI is on. */
export const ASSISTANT_NAMESPACES = ["errors", "web.assistant"] as const;

/**
 * All of them. Each page gets only its own group (`ClientTexts`): the full home page no longer
 * carries the texts of the errors and of the waitlist (~20 KB), which it never uses (§9.4, the
 * speed step of the effects work).
 */
export const CLIENT_NAMESPACES = [
  ...new Set([...SHELL_NAMESPACES, ...PRELAUNCH_NAMESPACES, ...TOKEN_NAMESPACES, ...FULL_HOME_NAMESPACES, ...ACCOUNT_NAMESPACES, ...BOOKING_NAMESPACES, ...ASSISTANT_NAMESPACES]),
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
