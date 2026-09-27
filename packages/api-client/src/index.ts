/**
 * Typed client for the Jungle Padel API (ADR-0007).
 *
 * `schema.d.ts` is GENERATED from `openapi.json` (never edit it by hand):
 *   uv run python apps/backend/manage.py export_openapi   # writes openapi.json
 *   pnpm --filter @jungle/api-client generate              # writes src/schema.d.ts
 */
import createClient, { type Client, type Middleware } from "openapi-fetch";
import type { components, paths } from "./schema.d.ts";

export type { components, paths };

/** Every API error has this shape; `code` is translated with packages/i18n (`errors.<code>`). */
export type ApiError = components["schemas"]["ErrorOut"];

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function readCookie(name: string, cookieHeader: string): string | undefined {
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/** Sends Django's CSRF token on state-changing requests (cookie `csrftoken`). */
export const csrfMiddleware: Middleware = {
  onRequest({ request }) {
    if (!SAFE_METHODS.has(request.method) && typeof document !== "undefined") {
      const token = readCookie("csrftoken", document.cookie);
      if (token) request.headers.set("X-CSRFToken", token);
    }
    return request;
  },
};

export function createApiClient(baseUrl: string): Client<paths> {
  const client = createClient<paths>({ baseUrl, credentials: "include" });
  client.use(csrfMiddleware);
  return client;
}
