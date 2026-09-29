/**
 * The café display (§8.7): today's paid orders, live (number, products, time), in three
 * columns: new → preparing → ready; the bar taps an order to move it on, and "picked up" takes
 * it off the screen. A new order rings. When an order is ready, its number goes to the lobby
 * screens (Stage 9).
 *
 * Configuration comes from the Hardware Bridge on the display's machine ("hello": the API
 * address and the device token, ADR-0013); in development, without a bridge, from
 * `VITE_API_URL` and `VITE_DEVICE_TOKEN`.
 */
import { ApiError, Offline, useDevice } from "@jungle/kiosk-kit";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { displayApi, NEXT, newOrders, type Order } from "./api";
import { errorText, formatTime, type Lang, t } from "./i18n";
import { ring } from "./sound";

export const REFRESH_MS = 3000;
const BRIDGE_URL = import.meta.env.VITE_BRIDGE_URL ?? "ws://127.0.0.1:8765";
const COLUMNS = ["new", "preparing", "ready"] as const;

function devConfig() {
  const apiUrl = import.meta.env.VITE_API_URL;
  const token = import.meta.env.VITE_DEVICE_TOKEN;
  // Only a development build may take the token from the environment (never a published file).
  return import.meta.env.DEV && apiUrl && token ? { apiUrl, token } : null;
}

export function App() {
  const [lang, setLang] = useState<Lang>("ro");
  const { config, bridgeUp } = useDevice({
    bridgeUrl: BRIDGE_URL,
    devConfig: devConfig(),
    onScan: () => undefined,
    wedge: false,
  });
  const api = useMemo(() => (config ? displayApi(config.apiUrl, config.token) : null), [config]);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [message, setMessage] = useState("");
  const [announce, setAnnounce] = useState("");
  const [sound, setSound] = useState<AudioContext | null>(null);
  const previous = useRef<Order[] | null>(null);
  const soundRef = useRef(sound);
  soundRef.current = sound;

  const load = useCallback(async () => {
    if (!api) return;
    try {
      const queue = await api.queue();
      const fresh = newOrders(previous.current, queue);
      previous.current = queue;
      setOrders(queue);
      setOffline(false);
      if (fresh.length > 0) {
        setAnnounce(fresh.map((o) => t(lang, "newOrder", { number: o.number })).join(" · "));
        if (soundRef.current) ring(soundRef.current);
      }
    } catch (error) {
      if (error instanceof Offline) setOffline(true);
      else if (error instanceof ApiError) setMessage(errorText(lang, error.code, error.params));
    }
  }, [api, lang]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const advance = async (order: Order) => {
    const next = NEXT[order.status];
    if (!api || !next) return;
    try {
      await api.advance(order.id, next);
      setMessage("");
      await load();
    } catch (error) {
      if (error instanceof Offline) setOffline(true);
      else if (error instanceof ApiError) setMessage(errorText(lang, error.code, error.params));
      await load();
    }
  };

  if (!api) {
    return (
      <main className="kiosk kiosk--center" lang={lang}>
        <h1 className="brand">{t(lang, "title")}</h1>
        <p className="notice" role="alert">
          {bridgeUp === false ? t(lang, "bridgeMissing") : t(lang, "notConfigured")}
        </p>
      </main>
    );
  }

  return (
    <main className="kiosk" lang={lang}>
      <header className="topbar">
        <span className="brand">Jungle Padel · {t(lang, "title")}</span>
        <button
          type="button"
          className="button button--quiet"
          aria-pressed={sound !== null}
          onClick={() => setSound(sound ?? new AudioContext())}
        >
          {sound ? t(lang, "soundOn") : t(lang, "sound")}
        </button>
        <button type="button" className="button button--quiet" onClick={() => setLang(lang === "ro" ? "en" : "ro")}>
          {t(lang, "language")}
        </button>
      </header>
      {offline ? (
        <p className="banner banner--error" role="alert">
          {t(lang, "offline")}
        </p>
      ) : null}
      {message ? (
        <p className="banner banner--error" role="alert">
          {message}
        </p>
      ) : null}
      <p className="visually-hidden" aria-live="assertive">
        {announce}
      </p>
      <div className="columns">
        {COLUMNS.map((column) => {
          const list = (orders ?? []).filter((o) => o.status === column);
          return (
            <section key={column} className={`column column--${column}`} aria-labelledby={`col-${column}`}>
              <h2 id={`col-${column}`}>
                {t(lang, `columns.${column}`)} <span className="column__count">{list.length}</span>
              </h2>
              {list.length === 0 ? <p className="muted">{t(lang, "empty")}</p> : null}
              {list.map((order) => {
                const next = NEXT[order.status];
                return (
                  <article key={order.id} className="order" aria-label={t(lang, "order", { number: order.number })}>
                    <p className="order__number">{order.number}</p>
                    <p className="muted">{t(lang, "at", { time: formatTime(lang, order.created_at) })}</p>
                    <ul className="order__lines">
                      {order.lines.map((line, index) => (
                        <li key={`${line.name}:${index}`}>
                          {line.quantity} × {line.name}
                        </li>
                      ))}
                    </ul>
                    {next ? (
                      <button type="button" className="button button--primary" onClick={() => void advance(order)}>
                        {t(lang, `advance.${next}`)}
                      </button>
                    ) : null}
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </main>
  );
}
