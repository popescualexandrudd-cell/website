/**
 * The admin panel's link to the API (§8.6, ADR-0011): same origin, the session cookie, and the
 * CSRF token in the `X-CSRFToken` header of every change. Typed from the backend's OpenAPI
 * schema. Errors are read like the kiosks read them: `Offline` (network or server error) or
 * `ApiError` with the stable code, translated on screen.
 */
import type { components, paths } from "@jungle/api-client";
import { unwrap } from "@jungle/kiosk-kit";
import createClient from "openapi-fetch";

export { ApiError, Offline, unwrap } from "@jungle/kiosk-kit";

export type Schemas = components["schemas"];
export type Permissions = Schemas["PermissionsOut"];
export type Dashboard = Schemas["DashboardOut"];
export type Me = Schemas["MeOut"];

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

export function csrfFromCookie(cookie: string): string {
  const found = cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith("csrftoken="));
  return found ? decodeURIComponent(found.slice("csrftoken=".length)) : "";
}

/** `fetch` with the session cookie and, on a change, the CSRF header. */
export function withCsrf(fetchImpl: typeof fetch = fetch, readCookie: () => string = () => document.cookie) {
  return (input: Request): Promise<Response> => {
    const request = new Request(input, { credentials: "same-origin" });
    if (!SAFE.has(request.method)) request.headers.set("X-CSRFToken", csrfFromCookie(readCookie()));
    return fetchImpl(request);
  };
}

export function adminApi(fetchImpl?: typeof fetch, readCookie?: () => string) {
  // Same origin: the page's own address (the proxy sends /api to the backend).
  const client = createClient<paths>({ baseUrl: window.location.origin, fetch: withCsrf(fetchImpl, readCookie) });
  return {
    client,
    csrf: () => unwrap(client.GET("/api/v1/auth/csrf")),
    session: () => unwrap(client.GET("/api/v1/auth/session")),
    login: (email: string, password: string, otpCode: string | null) =>
      unwrap(client.POST("/api/v1/auth/login", { body: { email, password, otp_code: otpCode } })),
    logout: () => unwrap(client.POST("/api/v1/auth/logout")),
    mfaSetup: () => unwrap(client.POST("/api/v1/auth/mfa/setup")),
    mfaConfirm: (code: string) => unwrap(client.POST("/api/v1/auth/mfa/confirm", { body: { code } })),
    permissions: () => unwrap(client.GET("/api/v1/staff/panel/permissions")),
    dashboard: (locationId: string) =>
      unwrap(client.GET("/api/v1/staff/panel/dashboard", { params: { query: { location_id: locationId } } })),
  };
}

export type AdminApi = ReturnType<typeof adminApi>;
