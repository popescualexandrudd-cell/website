/**
 * The message namespaces that client components read with useTranslations (first segment of
 * "league.form" and the like). Only these are sent to the browser; the rest are used on the server
 * and would only make every page heavier. tests/unit/misc.test.ts checks that no client namespace
 * is missing from this list.
 */
export const CLIENT_NAMESPACES = [
  "academy",
  "assistant",
  "booking",
  "common",
  "consent",
  "contact",
  "errors",
  "finder",
  "footer",
  "form",
  "gallery",
  "gift",
  "league",
  "manage",
  "newsletter",
  "partner",
  "rental",
  "review",
  "waitlist",
] as const;
