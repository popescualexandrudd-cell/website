import { describe, expect, it } from "vitest";
import {
  type EventRequest,
  type Subscription,
  type Voucher,
  clubToday,
  entryChange,
  keyBytes,
  partnerIdFrom,
  qrImage,
  sortEvents,
  sortSubscriptions,
  sortVouchers,
} from "./member";

const voucher = (id: string, status: string, from: string, until: string): Voucher =>
  ({ id, status, valid_from: from, valid_until: until }) as Voucher;
const subscription = (id: string, status: string, starts: string, ends: string): Subscription =>
  ({ id, status, starts_on: starts, ends_on: ends }) as Subscription;

describe("the account's money (R-065, ADR-0009)", () => {
  it("reads the ledger's signs from the visitor's side", () => {
    // Customer balance: a credit (−) is money the club holds for the visitor.
    expect(entryChange({ account: "customer_balance", amount: -5000 })).toEqual({ side: "credit", delta: 5000 });
    expect(entryChange({ account: "customer_balance", amount: 2000 })).toEqual({ side: "credit", delta: -2000 });
    // Receivable: a debit (+) is what the visitor owes; a payment (−) lowers it.
    expect(entryChange({ account: "receivable", amount: 8000 })).toEqual({ side: "debt", delta: 8000 });
    expect(entryChange({ account: "receivable", amount: -8000 })).toEqual({ side: "debt", delta: -8000 });
  });

  it("R-121: usable vouchers first, the soonest to expire at the top", () => {
    const today = "2027-04-10";
    const { usable, other } = sortVouchers(
      [
        voucher("later", "active", "2027-04-01", "2027-06-30"),
        voucher("used", "redeemed", "2027-03-01", "2027-05-01"),
        voucher("soon", "active", "2027-04-01", "2027-04-10"),
        voucher("expired", "active", "2027-01-01", "2027-04-09"),
        voucher("not-yet", "active", "2027-04-11", "2027-07-01"),
      ],
      today,
    );
    expect(usable.map((v) => v.id)).toEqual(["soon", "later"]);
    expect(other.map((v) => v.id)).toEqual(["not-yet", "used", "expired"]);
  });

  it("subscriptions: active, then awaiting payment, then the rest, newest first", () => {
    const today = "2027-04-10";
    const list = sortSubscriptions(
      [
        subscription("old", "active", "2027-01-01", "2027-01-31"),
        subscription("pending", "pending_payment", "2027-05-01", "2027-05-31"),
        subscription("now", "active", "2027-04-01", "2027-04-30"),
        subscription("cancelled", "cancelled", "2027-03-01", "2027-03-31"),
      ],
      today,
    );
    expect(list.map((s) => s.id)).toEqual(["now", "pending", "cancelled", "old"]);
  });
});

describe("the member card (R-020)", () => {
  it("shows the server's SVG only as an image", () => {
    const url = qrImage('<svg xmlns="http://www.w3.org/2000/svg"><script>x</script></svg>');
    expect(url.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(url).not.toContain("<");
  });
});

describe("the club's day (ADR-0010)", () => {
  it("is Bucharest's date, also across midnight UTC and the change to summer time", () => {
    expect(clubToday(new Date("2027-04-10T21:30:00Z"))).toBe("2027-04-11");
    expect(clubToday(new Date("2027-03-27T22:30:00Z"))).toBe("2027-03-28");
    expect(clubToday(new Date("2027-03-28T20:59:00Z"))).toBe("2027-03-28");
  });
});

describe("the event room requests (R-110, Q34)", () => {
  it("the next ones first, soonest at the top; then the past ones, latest first", () => {
    const now = new Date("2027-04-10T12:00:00Z");
    const request = (id: string, starts: string, ends: string) => ({ id, starts_at: starts, ends_at: ends }) as EventRequest;
    const list = sortEvents(
      [
        request("june", "2027-06-01T15:00:00Z", "2027-06-01T18:00:00Z"),
        request("march", "2027-03-01T15:00:00Z", "2027-03-01T18:00:00Z"),
        request("may", "2027-05-01T15:00:00Z", "2027-05-01T18:00:00Z"),
        request("january", "2027-01-10T15:00:00Z", "2027-01-10T18:00:00Z"),
      ],
      now,
    );
    expect(list.map((e) => e.id)).toEqual(["may", "june", "march", "january"]);
  });
});

describe("a tournament partner (§6.14)", () => {
  it("is read from the address of their public page, or the bare id", () => {
    const id = "3f2a9c1e-8b7d-4e6f-a5b4-c3d2e1f0a9b8";
    expect(partnerIdFrom(`https://junglepadel.ro/ro/liga/jucator/${id}`)).toBe(id);
    expect(partnerIdFrom(` ${id.toUpperCase()} `)).toBe(id);
    expect(partnerIdFrom("Andrei Mocanu")).toBeNull();
    expect(partnerIdFrom("")).toBeNull();
  });
});

describe("push notifications (Q17)", () => {
  it("the club's key as bytes, from base64url without padding", () => {
    expect(Array.from(keyBytes("AQID_-8"))).toEqual([1, 2, 3, 255, 239]);
    expect(keyBytes("BAAA").length).toBe(3);
  });
});
