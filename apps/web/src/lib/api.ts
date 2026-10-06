import { createApiClient } from "@jungle/api-client";
import { SERVER_API_URL } from "./site";

export const api = createApiClient(SERVER_API_URL);

export type ApiErrorBody = { error?: { code?: string; params?: Record<string, unknown> } };

/** The translation key for an API error (packages/i18n `errors.<code>`), or null if unknown. */
export function errorKey(body: unknown, known: (key: string) => boolean): string | null {
  const code = (body as ApiErrorBody | undefined)?.error?.code;
  if (typeof code !== "string" || !/^[a-z_]+\.[a-z_]+$/.test(code)) return null;
  return known(code) ? code : null;
}

export function errorParams(body: unknown): Record<string, string | number> {
  const params = (body as ApiErrorBody | undefined)?.error?.params ?? {};
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" || typeof value === "number") out[key] = value;
  }
  return out;
}
