/** What every screen of the Payments Kiosk shares: language, API, the customer's session, the
 * basket, the cash payment on screen, messages. */
import type { BridgeLink } from "@jungle/kiosk-kit";
import { createContext, useContext } from "react";
import type { Card, Idle, Item, PaymentsApi, Session } from "./lib/api";
import type { Basket } from "./lib/basket";
import { type Lang, type Params, t } from "./lib/i18n";
import type { CashPayment, PaymentView } from "./lib/payment";

export type Screen =
  | "home"
  | "cafe"
  | "basket"
  | "split"
  | "checkout"
  | "subscription"
  | "freeze"
  | "voucher"
  | "staff";

/** A player of the group who scanned their card to pay their share (R-061). */
export type Participant = { name: string; card: Card };

export type PayKiosk = {
  lang: Lang;
  api: PaymentsApi;
  idle: Idle | null;
  session: Session | null;
  /** The card for the next action: the open session (one scan, several actions). */
  card: Card;
  basket: Basket;
  setBasket: (next: Basket) => void;
  /** The booking being split (R-060, R-061). */
  splitting: string | null;
  split: (bookingId: string) => void;
  group: Participant[];
  setGroup: (group: Participant[]) => void;
  offline: boolean;
  bridge: BridgeLink | null;
  goto: (screen: Screen) => void;
  refresh: () => Promise<void>;
  notify: (text: string, kind?: "ok" | "error") => void;
  fail: (error: unknown) => void;
  /** A screen that needs another card (a partner, the staff card) takes the next scan. */
  takeNextScan: (handler: ((card: Card) => void) | null) => void;
  logout: () => void;
  /** Pays in cash; `card` pays for someone else of the group (the split hour). */
  pay: (items: Item[], card?: Card, back?: Screen) => void;
  payment: CashPayment | null;
  paymentView: PaymentView | null;
  /** After the payment screen: back where the customer came from. */
  paymentBack: Screen;
  endPayment: () => void;
};

export const KioskContext = createContext<PayKiosk | null>(null);

export function useKiosk(): PayKiosk {
  const kiosk = useContext(KioskContext);
  if (!kiosk) throw new Error("KioskContext missing");
  return kiosk;
}

export function useT(): (key: string, params?: Params) => string {
  const { lang } = useKiosk();
  return (key, params) => t(lang, key, params);
}
