/**
 * The club's screens (§8.5): a court screen (the device names its court) or a lobby / café /
 * mezzanine screen, decided by the server. The state comes from the API; the WebSocket only
 * says "changed" (ADR-0005). Never a blank screen: the last state is kept (memory and this
 * browser), shown with a discreet indicator while the connection is down, and reloaded on its
 * own when a session ends or begins, and every minute as a safety net.
 *
 * Configuration comes from the Hardware Bridge on the screen's machine ("hello": the API
 * address and the device token, ADR-0013); in development, without a bridge, from
 * `VITE_API_URL` and `VITE_DEVICE_TOKEN`. `?lang=en` shows the screen in English.
 */
import { ApiError, useDevice } from "@jungle/kiosk-kit";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ScreenState, screenApi } from "./api";
import { type Lang, t } from "./i18n";
import { LiveLink, type LiveStatus } from "./live";
import { keep, lastKept } from "./store";
import { clockOffset, nextBoundary } from "./time";
import { Court } from "./views/Court";
import { Lobby } from "./views/Lobby";
import { Connection, Jungle } from "./views/parts";

export const SAFETY_RELOAD_MS = 60_000;
const BRIDGE_URL = import.meta.env.VITE_BRIDGE_URL ?? "ws://127.0.0.1:8765";
const MAX_TIMEOUT = 2 ** 31 - 1;

function devConfig() {
  const apiUrl = import.meta.env.VITE_API_URL;
  const token = import.meta.env.VITE_DEVICE_TOKEN;
  // Only a development build may take the token from the environment (never a published file).
  return import.meta.env.DEV && apiUrl && token ? { apiUrl, token } : null;
}

function languageOf(search: string): Lang {
  return new URLSearchParams(search).get("lang") === "en" ? "en" : "ro";
}

export function App() {
  const lang = languageOf(window.location.search);
  const { config, bridgeUp } = useDevice({
    bridgeUrl: BRIDGE_URL,
    devConfig: devConfig(),
    onScan: () => undefined,
    wedge: false,
  });
  const api = useMemo(() => (config ? screenApi(config.apiUrl, config.token) : null), [config]);
  const kept = useMemo(() => lastKept(), []);
  const [state, setState] = useState<ScreenState | null>(kept?.state ?? null);
  const [receivedAt, setReceivedAt] = useState<number | null>(kept?.receivedAt ?? null);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [refused, setRefused] = useState("");
  const [now, setNow] = useState(Date.now());
  const loading = useRef(false);
  const again = useRef(false);

  const load = useCallback(async () => {
    if (!api) return;
    if (loading.current) {
      again.current = true; // a change came during a load: one more load after it
      return;
    }
    loading.current = true;
    try {
      const fresh = await api.state();
      const at = Date.now();
      setState(fresh);
      setReceivedAt(at);
      setOffset(clockOffset(fresh.server_time, at));
      setRefused("");
      keep(fresh, at);
    } catch (error) {
      // Offline (or anything unexpected): the last state stays on screen. Refused: the screen
      // says so, over the last state (never blank).
      if (error instanceof ApiError) setRefused(error.code);
    } finally {
      loading.current = false;
      if (again.current) {
        again.current = false;
        void load();
      }
    }
  }, [api]);

  // The live connection, and a reload every minute whatever happens to it.
  useEffect(() => {
    if (!api || !config) return;
    void load();
    const link = new LiveLink(config.apiUrl, () => api.ticket(), {
      onChanged: () => void load(),
      onStatus: setStatus,
    });
    void link.connect();
    const safety = setInterval(() => void load(), SAFETY_RELOAD_MS);
    return () => {
      link.close();
      clearInterval(safety);
    };
  }, [api, config, load]);

  // The time left moves every second, on the server's clock.
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  // A session ending or starting is not a change in the database: reload at that moment.
  const boundary = useMemo(() => {
    if (!state) return null;
    const courts = state.court ? [state.court] : state.courts;
    return nextBoundary(
      courts.flatMap((c) => [c.current?.ends_at, c.next?.starts_at]),
      Date.now() + offset,
    );
  }, [state, offset]);
  useEffect(() => {
    if (boundary === null) return;
    const wait = Math.min(MAX_TIMEOUT, Math.max(0, boundary - (Date.now() + offset)) + 1000);
    const timer = setTimeout(() => void load(), wait);
    return () => clearTimeout(timer);
  }, [boundary, offset, load]);

  const serverNow = now + offset;
  if (!state) {
    const notice = refused
      ? t(lang, "refused")
      : !api
        ? bridgeUp === false
          ? t(lang, "bridgeMissing")
          : t(lang, "notConfigured")
        : t(lang, "loading");
    return (
      <main className="screen screen--idle screen--waiting" lang={lang}>
        <Jungle />
        <h1 className="brand">Jungle Padel</h1>
        <p className="notice" role="status">
          {notice}
        </p>
      </main>
    );
  }
  return (
    <>
      {state.kind === "court" ? (
        <Court lang={lang} state={state} now={serverNow} />
      ) : (
        <Lobby lang={lang} state={state} now={serverNow} />
      )}
      {refused ? (
        <p className="banner banner--error screen__refused" role="alert">
          {t(lang, "refused")}
        </p>
      ) : null}
      <Connection lang={lang} status={status} receivedAt={receivedAt} />
    </>
  );
}
