/**
 * The last state received, kept in this browser (public data only, R-012): after a restart or
 * a power cut the screen shows it at once, marked with its time, until the server answers
 * again. Never a blank screen (§8.5). Storage may be missing or full: then only memory is used.
 */
import type { ScreenState } from "./api";

export const STORAGE_KEY = "jungle.screens.last-state";

export type Kept = { state: ScreenState; receivedAt: number };

export function keep(state: ScreenState, receivedAt: number, storage: Storage | undefined = globalStorage()): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify({ state, receivedAt }));
  } catch {
    // full or refused: the screen still has the state in memory
  }
}

export function lastKept(storage: Storage | undefined = globalStorage()): Kept | null {
  try {
    const text = storage?.getItem(STORAGE_KEY);
    if (!text) return null;
    const kept = JSON.parse(text) as Partial<Kept>;
    const state = kept.state as Partial<ScreenState> | undefined;
    if (typeof kept.receivedAt !== "number" || !state || (state.kind !== "court" && state.kind !== "lobby")) {
      return null;
    }
    return { state: state as ScreenState, receivedAt: kept.receivedAt };
  } catch {
    return null;
  }
}

function globalStorage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}
