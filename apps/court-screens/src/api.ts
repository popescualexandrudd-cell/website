/**
 * The screens' API (`/api/v1/device/screen`, §8.5), typed from the backend's OpenAPI schema:
 * the full picture (`/state`) and a one-time ticket for the WebSocket that says when to reload
 * it (ADR-0005). Every call carries the device token (ADR-0012); errors are read by
 * `@jungle/kiosk-kit`.
 */
import type { components, paths } from "@jungle/api-client";
import { apiOrigin, deviceHeaders, unwrap } from "@jungle/kiosk-kit";
import createClient from "openapi-fetch";

export type ScreenState = components["schemas"]["ScreenStateOut"];
export type CourtState = components["schemas"]["ScreenCourtOut"];
export type Session = components["schemas"]["ScreenSessionOut"];
export type Player = components["schemas"]["ScreenPlayerOut"];
export type Row = components["schemas"]["ScreenRowOut"];

export function screenApi(apiUrl: string, deviceToken: string, fetchImpl?: typeof fetch) {
  const client = createClient<paths>({
    baseUrl: apiOrigin(apiUrl),
    headers: deviceHeaders(deviceToken),
    ...(fetchImpl ? { fetch: fetchImpl } : {}),
  });
  return {
    state: () => unwrap(client.GET("/api/v1/device/screen/state")),
    ticket: () => unwrap(client.POST("/api/v1/device/screen/ticket")),
  };
}

export type ScreenApi = ReturnType<typeof screenApi>;

/** The WebSocket address on the same server as the API: http → ws, https → wss. */
export function socketUrl(apiUrl: string, path: string, ticket: string): string {
  const origin = apiOrigin(apiUrl).replace(/^http/, "ws");
  return `${origin}${path}?ticket=${encodeURIComponent(ticket)}`;
}
