/**
 * The basket at the Payments Kiosk (§8.3): what the customer pays now. A booking, a class
 * place, a subscription or a tournament fee (all of it, or a part: the share of the hour,
 * R-060, R-061), and café products (one order). Amounts in bani (ADR-0009).
 */
import type { Item, Payable, Product } from "./api";

export type PayableKind = "booking" | "enrollment" | "subscription" | "tournament_entry";

export type Entry = {
  key: string;
  kind: PayableKind;
  subjectId: string;
  description: string;
  /** What is paid now (at most `max`, what is left to pay). */
  amount: number;
  max: number;
};

export type CafeLine = { product: Product; quantity: number };

export type Basket = { entries: Entry[]; cafe: CafeLine[] };

export const EMPTY: Basket = { entries: [], cafe: [] };
export const MAX_ENTRIES = 9; // the server takes 10 items; the café order is one of them
export const MAX_QUANTITY = 20;

export function addPayable(basket: Basket, payable: Payable, amount = payable.to_pay): Basket {
  const key = `${payable.kind}:${payable.subject_id}`;
  const entry: Entry = {
    key,
    kind: payable.kind as PayableKind,
    subjectId: payable.subject_id,
    description: payable.description,
    amount: Math.max(1, Math.min(amount, payable.to_pay)),
    max: payable.to_pay,
  };
  const others = basket.entries.filter((e) => e.key !== key);
  if (others.length >= MAX_ENTRIES) return basket;
  return { ...basket, entries: [...others, entry] };
}

export function remove(basket: Basket, key: string): Basket {
  if (key === "cafe") return { ...basket, cafe: [] };
  return { ...basket, entries: basket.entries.filter((e) => e.key !== key) };
}

/** Adds (or, with a negative delta, takes away) a café product. */
export function changeCafe(basket: Basket, product: Product, delta: number): Basket {
  const current = basket.cafe.find((l) => l.product.id === product.id)?.quantity ?? 0;
  const quantity = Math.max(0, Math.min(MAX_QUANTITY, current + delta));
  const others = basket.cafe.filter((l) => l.product.id !== product.id);
  const cafe = quantity ? [...others, { product, quantity }] : others;
  cafe.sort((a, b) => a.product.name_ro.localeCompare(b.product.name_ro, "ro"));
  return { ...basket, cafe };
}

export function quantityOf(basket: Basket, productId: string): number {
  return basket.cafe.find((l) => l.product.id === productId)?.quantity ?? 0;
}

export function cafeTotal(basket: Basket): number {
  return basket.cafe.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
}

export function total(basket: Basket): number {
  return basket.entries.reduce((sum, e) => sum + e.amount, 0) + cafeTotal(basket);
}

export function isEmpty(basket: Basket): boolean {
  return basket.entries.length === 0 && basket.cafe.length === 0;
}

/** Markers of a price that is still indicative (DE_STABILIT / DE_CONFIRMAT, Q21). */
export const INDICATIVE = ["to_set", "to_confirm"];

/** Whether a price in the basket is still indicative. */
export function hasIndicativePrices(basket: Basket): boolean {
  return basket.cafe.some((l) => INDICATIVE.includes(l.product.marker));
}

export function toItem(entry: Entry): Item {
  return {
    kind: entry.kind,
    subject_id: entry.subjectId,
    amount: entry.amount,
    cafe_lines: [],
  };
}

export function cafeItem(basket: Basket): Item | null {
  if (basket.cafe.length === 0) return null;
  return {
    kind: "cafe",
    subject_id: null,
    amount: null,
    cafe_lines: basket.cafe.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
  };
}

/** What the server is asked to charge, in the basket's order (café last). */
export function toItems(basket: Basket): Item[] {
  const cafe = cafeItem(basket);
  return [...basket.entries.map(toItem), ...(cafe ? [cafe] : [])];
}
