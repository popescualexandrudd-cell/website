/**
 * The Payments Kiosk API (`/api/v1/kiosk/payments`, §8.3), typed from the backend's OpenAPI
 * schema, plus the public subscription configurator (R-081). Every call carries the device
 * token (ADR-0012); errors are read by `@jungle/kiosk-kit` (`Offline`, `ApiError`).
 */
import type { components, paths } from "@jungle/api-client";
import { apiOrigin, deviceHeaders, type Signed, unwrap } from "@jungle/kiosk-kit";
import createClient from "openapi-fetch";

type Schemas = components["schemas"];
export type Card = Schemas["CardIn"];
export type Idle = Schemas["PaymentsIdleOut"];
export type Category = Schemas["CategoryOut"];
export type Product = Schemas["ProductOut"];
export type Session = Schemas["PaymentsSessionOut"];
export type Payable = Schemas["PayableOut"];
export type Voucher = Schemas["PaymentsVoucherOut"];
export type ActiveSubscription = Schemas["ActiveSubscriptionOut"];
export type Split = Schemas["PaymentsSplitOut"];
export type Item = Schemas["ItemIn"];
export type Checkout = Schemas["CheckoutOut"];
export type Settled = Schemas["SettledOut"];
export type Options = Schemas["OptionsOut"];
export type Quote = Schemas["SubscriptionQuoteOut"];
export type Selection = Schemas["SelectionIn"];
export type Period = "monthly" | "quarterly" | "annual";
export type ChangeMode = "normal" | "exact" | "credit";
export type OperationKind = "refill" | "empty" | "count" | "day_close";
export type Operation = Schemas["OperationOut"];

const base = "/api/v1/kiosk/payments" as const;

export function paymentsApi(apiUrl: string, deviceToken: string, fetchImpl?: typeof fetch) {
  const client = createClient<paths>({
    baseUrl: apiOrigin(apiUrl),
    headers: deviceHeaders(deviceToken),
    ...(fetchImpl ? { fetch: fetchImpl } : {}),
  });
  const events = (list: Signed[]) => ({ body: { events: list } });
  const onCheckout = (id: string) => ({ path: { checkout_id: id } });
  return {
    idle: () => unwrap(client.GET(`${base}/idle`)),
    session: (card: Card) => unwrap(client.POST(`${base}/session`, { body: { card } })),
    logout: (session: string) => unwrap(client.POST(`${base}/logout`, { body: { session } })),
    checkIn: (card: Card) => unwrap(client.POST(`${base}/check-in`, { body: { card } })),
    split: (bookingId: string, parts: number) =>
      unwrap(
        client.GET(`${base}/bookings/{booking_id}/split`, {
          params: { path: { booking_id: bookingId }, query: { parts } },
        }),
      ),
    // cash (§8.3): the bridge does what the server signed; the server counts what the bridge signed
    create: (card: Card, items: Item[]) => unwrap(client.POST(`${base}/checkouts`, { body: { card, items } })),
    start: (id: string, card: Card, mode: ChangeMode) =>
      unwrap(
        client.POST(`${base}/checkouts/{checkout_id}/start`, {
          params: onCheckout(id),
          body: { card, change_mode: mode },
        }),
      ),
    events: (list: Signed[]) => unwrap(client.POST(`${base}/events`, events(list))),
    finish: (id: string, list: Signed[]) =>
      unwrap(client.POST(`${base}/checkouts/{checkout_id}/finish`, { params: onCheckout(id), ...events(list) })),
    settle: (id: string, list: Signed[]) =>
      unwrap(client.POST(`${base}/checkouts/{checkout_id}/settle`, { params: onCheckout(id), ...events(list) })),
    cancel: (id: string, list: Signed[]) =>
      unwrap(client.POST(`${base}/checkouts/{checkout_id}/cancel`, { params: onCheckout(id), ...events(list) })),
    refunded: (id: string, list: Signed[]) =>
      unwrap(client.POST(`${base}/checkouts/{checkout_id}/refunded`, { params: onCheckout(id), ...events(list) })),
    // without cash (§8.3 flow 6)
    payBalance: (card: Card, item: Item, key: string) =>
      unwrap(client.POST(`${base}/pay-balance`, { body: { card, item, idempotency_key: key } })),
    voucher: (card: Card, code: string, item: Item) =>
      unwrap(client.POST(`${base}/voucher`, { body: { card, code, item } })),
    // subscriptions (§8.3 flow 4)
    options: (location: string) =>
      unwrap(client.GET("/api/v1/subscriptions/options", { params: { query: { location } } })),
    quote: (location: string, selections: Selection[], period: Period) =>
      unwrap(client.POST("/api/v1/subscriptions/quote", { body: { location, selections, period } })),
    order: (card: Card, selections: Selection[], period: Period, startsOn: string) =>
      unwrap(
        client.POST(`${base}/subscriptions`, {
          body: { card, selections, period, starts_on: startsOn },
        }),
      ),
    freeze: (subscriptionId: string, card: Card, startsOn: string, days: number) =>
      unwrap(
        client.POST(`${base}/subscriptions/{subscription_id}/freeze`, {
          params: { path: { subscription_id: subscriptionId } },
          body: { card, starts_on: startsOn, days },
        }),
      ),
    alert: (code: string) => unwrap(client.POST(`${base}/alerts`, { body: { code } })),
    // staff mode (§8.3, Q54)
    staffLogin: (card: Card, pin: string) => unwrap(client.POST(`${base}/staff/login`, { body: { card, pin } })),
    staffLogout: (token: string) => unwrap(client.POST(`${base}/staff/logout`, { body: { token } })),
    operation: (token: string, kind: OperationKind, notes?: Record<string, number>) =>
      unwrap(client.POST(`${base}/staff/operations`, { body: { token, kind, notes: notes ?? null } })),
    operations: (token: string) => unwrap(client.POST(`${base}/staff/operations/list`, { body: { token } })),
  };
}

export type PaymentsApi = ReturnType<typeof paymentsApi>;
