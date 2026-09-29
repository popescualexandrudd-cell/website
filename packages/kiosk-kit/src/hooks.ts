/**
 * What every kiosk screen does the same way:
 * - `useDevice`: the link to the Hardware Bridge, the configuration it gives ("hello": the API
 *   address and the device token), signed scans and cash events; without a bridge (development
 *   only), a keyboard-wedge scanner and the configuration from `VITE_*`.
 * - `useIdle`: the session ends after a while without a touch.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { type BridgeEvent, BridgeLink, type Hello, type Signed } from "./bridge";
import { createWedge } from "./wedge";

export type DeviceConfig = { apiUrl: string; token: string };

export type DeviceOptions = {
  bridgeUrl: string;
  /** Development only (a production build never carries a token): from `VITE_*`. */
  devConfig: DeviceConfig | null;
  onScan: (card: { signed: Signed } | { token: string }) => void;
  onEvent?: (event: BridgeEvent) => void;
  /** Whether a keyboard-wedge scanner may be used while the bridge is missing. */
  wedge?: boolean;
};

export type Device = {
  config: DeviceConfig | null;
  /** null: not known yet (the first connection is under way). */
  bridgeUp: boolean | null;
  simulator: boolean;
  link: BridgeLink | null;
};

export function useDevice(options: DeviceOptions): Device {
  const [config, setConfig] = useState<DeviceConfig | null>(options.devConfig);
  const [bridgeUp, setBridgeUp] = useState<boolean | null>(null);
  const [simulator, setSimulator] = useState(false);
  const [link, setLink] = useState<BridgeLink | null>(null);
  const handlers = useRef(options);
  handlers.current = options;

  useEffect(() => {
    const next = new BridgeLink(options.bridgeUrl, {
      onScan: (signed) => handlers.current.onScan({ signed }),
      onEvent: (event) => handlers.current.onEvent?.(event),
      onStatus: setBridgeUp,
      onHello: (hello: Hello) => {
        setSimulator(hello.simulator);
        if (hello.api_url && hello.device_token) {
          setConfig({ apiUrl: hello.api_url, token: hello.device_token });
        }
      },
    });
    setLink(next);
    next.connect();
    return () => next.close();
  }, [options.bridgeUrl]);

  const wedge = options.wedge !== false;
  useEffect(() => {
    if (bridgeUp || !wedge) return;
    const feed = createWedge((code) => handlers.current.onScan({ token: code }));
    const listener = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      feed(event.key);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [bridgeUp, wedge]);

  return { config, bridgeUp, simulator, link };
}

/**
 * Seconds left before `onTimeout` while `active`; any touch or key starts the count again.
 * `hold` pauses it (money in the machine: the customer is never logged out mid-payment).
 */
export function useIdle(active: boolean, ms: number, onTimeout: () => void, hold = false) {
  const [lastTouch, setLastTouch] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const timeout = useRef(onTimeout);
  timeout.current = onTimeout;

  const touch = useCallback(() => setLastTouch(Date.now()), []);
  // `now` stops while not counting: a touch made since then is never in the future.
  const elapsed = Math.max(0, now - lastTouch);

  // The clock ticks only while it counts (or holds): an idle kiosk is not re-rendered every
  // second for hours, and its screens are not reloaded with it.
  const counting = active || hold;
  useEffect(() => {
    if (!counting) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [counting]);
  useEffect(() => {
    if (hold) setLastTouch(Date.now());
  }, [hold, now]);
  useEffect(() => {
    if (active && !hold && elapsed >= ms) {
      setLastTouch(Date.now());
      timeout.current();
    }
  }, [active, hold, elapsed, ms]);
  useEffect(() => {
    window.addEventListener("pointerdown", touch);
    window.addEventListener("keydown", touch);
    return () => {
      window.removeEventListener("pointerdown", touch);
      window.removeEventListener("keydown", touch);
    };
  }, [touch]);

  const secondsLeft = Math.max(0, Math.ceil((ms - elapsed) / 1000));
  return { secondsLeft, touch };
}
