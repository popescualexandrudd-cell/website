/**
 * The café display's API (`/api/v1/device/cafe`, §8.7), typed from the backend's OpenAPI
 * schema: today's paid orders, and the bar's taps (new → preparing → ready → picked up). Every
 * call carries the device token (ADR-0012); errors are read by `@jungle/kiosk-kit`.
 */
import type { components, paths } from "@jungle/api-client";
import { apiOrigin, deviceHeaders, unwrap } from "@jungle/kiosk-kit";
import createClient from "openapi-fetch";

export type Order = components["schemas"]["OrderOut"];
export type Next = "preparing" | "ready" | "picked_up";

export const NEXT: Record<string, Next | undefined> = {
  new: "preparing",
  preparing: "ready",
  ready: "picked_up",
};

export function displayApi(apiUrl: string, deviceToken: string, fetchImpl?: typeof fetch) {
  const client = createClient<paths>({
    baseUrl: apiOrigin(apiUrl),
    headers: deviceHeaders(deviceToken),
    ...(fetchImpl ? { fetch: fetchImpl } : {}),
  });
  return {
    queue: () => unwrap(client.GET("/api/v1/device/cafe/queue")),
    advance: (orderId: string, status: Next) =>
      unwrap(
        client.POST("/api/v1/device/cafe/orders/{order_id}/advance", {
          params: { path: { order_id: orderId } },
          body: { status },
        }),
      ),
  };
}

export type DisplayApi = ReturnType<typeof displayApi>;

/** Orders that were not on screen before: the display rings for them. */
export function newOrders(before: Order[] | null, now: Order[]): Order[] {
  if (before === null) return [];
  const seen = new Set(before.map((o) => o.id));
  return now.filter((o) => o.status === "new" && !seen.has(o.id));
}
