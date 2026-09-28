/** What every screen of the kiosk shares: language, API, the player's session, messages. */
import { createContext, useContext } from "react";
import type { Card, KioskApi, Session } from "./lib/api";
import type { Lang, Params } from "./lib/i18n";
import { t } from "./lib/i18n";

export type Screen = "home" | "consent" | "score" | "confirm" | "challenges" | "standings" | "fixtures";

export type Kiosk = {
  lang: Lang;
  api: KioskApi;
  session: Session | null;
  /** The card for the next action: the open session (one scan, several actions). */
  card: Card;
  goto: (screen: Screen) => void;
  refresh: () => Promise<void>;
  notify: (text: string, kind?: "ok" | "error") => void;
  fail: (error: unknown) => void;
  /** A screen that needs another card (a challenge partner) takes the next scan. */
  takeNextScan: (handler: ((card: Card) => void) | null) => void;
  logout: () => void;
};

export const KioskContext = createContext<Kiosk | null>(null);

export function useKiosk(): Kiosk {
  const kiosk = useContext(KioskContext);
  if (!kiosk) throw new Error("KioskContext missing");
  return kiosk;
}

export function useT(): (key: string, params?: Params) => string {
  const { lang } = useKiosk();
  return (key, params) => t(lang, key, params);
}
