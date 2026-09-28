/**
 * The League Kiosk (§8.2). Idle: live standings, Match of the day, Kings, challenges and
 * "Scan your card". A scan opens the player's session (logged out after 30 s without a touch),
 * with the actions: join the league (GDPR), enter the score, confirm or dispute, challenges,
 * check-in, standings, tournament matches.
 *
 * Configuration comes from the Hardware Bridge ("hello": device token and API address). In
 * development, without a bridge, `VITE_API_URL` and `VITE_DEVICE_TOKEN` are used and cards are
 * read from a keyboard-wedge scanner.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, type Card, kioskApi, Offline, type Session } from "./lib/api";
import { BridgeLink, type Hello } from "./lib/bridge";
import { errorText, type Lang, t } from "./lib/i18n";
import { createWedge } from "./lib/wedge";
import { KioskContext, type Kiosk, type Screen } from "./kiosk";
import { Challenges } from "./screens/Challenges";
import { Confirm } from "./screens/Confirm";
import { Consent } from "./screens/Consent";
import { Fixtures } from "./screens/Fixtures";
import { Home } from "./screens/Home";
import { IdleScreen } from "./screens/Idle";
import { ScoreEntry } from "./screens/ScoreEntry";
import { Standings } from "./screens/Standings";
import { SimulatorPanel } from "./components/SimulatorPanel";

export const IDLE_LOGOUT_MS = 30_000;
const BRIDGE_URL = import.meta.env.VITE_BRIDGE_URL ?? "ws://127.0.0.1:8765";

type Config = { apiUrl: string; token: string };
type Message = { text: string; kind: "ok" | "error" };

function devConfig(): Config | null {
  const apiUrl = import.meta.env.VITE_API_URL;
  const token = import.meta.env.VITE_DEVICE_TOKEN;
  // Only a development build may take the token from the environment: a production build is
  // a public file, and the token must never be in it.
  return import.meta.env.DEV && apiUrl && token ? { apiUrl, token } : null;
}

export function App() {
  const [lang, setLang] = useState<Lang>("ro");
  const [config, setConfig] = useState<Config | null>(devConfig);
  const [bridgeUp, setBridgeUp] = useState<boolean | null>(null);
  const [simulator, setSimulator] = useState(false);
  const [offline, setOffline] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [message, setMessage] = useState<Message | null>(null);
  const [lastTouch, setLastTouch] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const scanHandler = useRef<((card: Card) => void) | null>(null);
  // Bumped at each logout: an answer that arrives after it must not bring the session back.
  const generation = useRef(0);
  const bridge = useRef<BridgeLink | null>(null);

  const api = useMemo(() => (config ? kioskApi(config.apiUrl, config.token) : null), [config]);

  const notify = useCallback((text: string, kind: "ok" | "error" = "ok") => {
    setMessage({ text, kind });
  }, []);

  const endSession = useCallback(
    (current: Session | null) => {
      generation.current += 1;
      if (current && api) void api.logout(current.session).catch(() => undefined);
      setSession(null);
      setScreen("home");
      scanHandler.current = null;
      setLang("ro");
    },
    [api],
  );

  const fail = useCallback(
    (error: unknown) => {
      if (error instanceof Offline) {
        setOffline(true);
        return;
      }
      if (error instanceof ApiError) {
        if (error.code === "devices.session_expired") endSession(null);
        notify(errorText(lang, error.code, error.params), "error");
        return;
      }
      notify(t(lang, "errors.generic"), "error");
    },
    [endSession, lang, notify],
  );

  const openSession = useCallback(
    async (card: Card, keepScreen = false) => {
      if (!api) return;
      const started = generation.current;
      try {
        const opened = await api.session(card);
        if (keepScreen && started !== generation.current) {
          void api.logout(opened.session).catch(() => undefined);
          return;
        }
        setOffline(false);
        setSession(opened);
        setLastTouch(Date.now());
        if (keepScreen) return;
        setLang(opened.language === "en" ? "en" : "ro");
        setScreen("home");
        setMessage(null);
      } catch (error) {
        fail(error);
      }
    },
    [api, fail],
  );

  const onCard = useCallback(
    (card: Card) => {
      setLastTouch(Date.now());
      if (scanHandler.current) scanHandler.current(card);
      else void openSession(card);
    },
    [openSession],
  );

  // The Hardware Bridge: configuration and signed scans.
  useEffect(() => {
    const link = new BridgeLink(BRIDGE_URL, {
      onScan: (signed) => onCardRef.current({ signed }),
      onStatus: setBridgeUp,
      onHello: (hello: Hello) => {
        setSimulator(hello.simulator);
        if (hello.api_url && hello.device_token) {
          setConfig({ apiUrl: hello.api_url, token: hello.device_token });
        }
      },
    });
    bridge.current = link;
    link.connect();
    return () => link.close();
  }, []);
  const onCardRef = useRef(onCard);
  onCardRef.current = onCard;

  // Without a bridge: a keyboard-wedge scanner (development).
  useEffect(() => {
    if (bridgeUp) return;
    const feed = createWedge((code) => onCardRef.current({ token: code }));
    const listener = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      feed(event.key);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [bridgeUp]);

  // Logged out after 30 s without a touch (§8.2).
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  useEffect(() => {
    if (session && now - lastTouch >= IDLE_LOGOUT_MS) endSession(session);
  }, [endSession, lastTouch, now, session]);
  useEffect(() => {
    const touched = () => setLastTouch(Date.now());
    window.addEventListener("pointerdown", touched);
    window.addEventListener("keydown", touched);
    return () => {
      window.removeEventListener("pointerdown", touched);
      window.removeEventListener("keydown", touched);
    };
  }, []);

  // Messages fade after a while.
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 8000);
    return () => clearTimeout(timer);
  }, [message]);

  const takeNextScan = useCallback((handler: ((card: Card) => void) | null) => {
    scanHandler.current = handler;
  }, []);

  const refresh = useCallback(async () => {
    if (session) await openSession({ session: session.session }, true);
  }, [openSession, session]);

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

  const kiosk: Kiosk = {
    lang,
    api,
    session,
    card: session ? { session: session.session } : {},
    goto: (next) => {
      scanHandler.current = null;
      setScreen(next);
    },
    refresh,
    notify,
    fail,
    takeNextScan,
    logout: () => endSession(session),
  };
  const secondsLeft = Math.max(0, Math.ceil((IDLE_LOGOUT_MS - (now - lastTouch)) / 1000));

  return (
    <KioskContext.Provider value={kiosk}>
      <main className="kiosk" lang={lang}>
        <header className="topbar">
          <span className="brand">Jungle Padel · {t(lang, "title")}</span>
          {session ? (
            <span className="topbar__session">
              {secondsLeft <= 10 ? (
                <span className="countdown" aria-live="polite">
                  {t(lang, "session.idleSoon", { seconds: secondsLeft })}
                </span>
              ) : null}
              <button type="button" className="button button--quiet" onClick={kiosk.logout}>
                {t(lang, "session.logout")}
              </button>
            </span>
          ) : null}
          <button
            type="button"
            className="button button--quiet"
            onClick={() => setLang(lang === "ro" ? "en" : "ro")}
          >
            {t(lang, "language")}
          </button>
        </header>
        {offline ? (
          <p className="banner banner--error" role="alert">
            {t(lang, "offline")}
          </p>
        ) : null}
        {bridgeUp === false && !import.meta.env.DEV ? (
          <p className="banner banner--error" role="alert">
            {t(lang, "bridgeMissing")}
          </p>
        ) : null}
        {message ? (
          <p className={`banner banner--${message.kind}`} role={message.kind === "error" ? "alert" : "status"}>
            {message.text}
          </p>
        ) : null}
        {session ? (
          <SessionScreens screen={screen} />
        ) : (
          <IdleScreen onBack={() => setOffline(false)} onOffline={() => setOffline(true)} />
        )}
        {simulator && bridge.current ? <SimulatorPanel link={bridge.current} /> : null}
      </main>
    </KioskContext.Provider>
  );
}

function SessionScreens({ screen }: { screen: Screen }) {
  switch (screen) {
    case "consent":
      return <Consent />;
    case "score":
      return <ScoreEntry />;
    case "confirm":
      return <Confirm />;
    case "challenges":
      return <Challenges />;
    case "standings":
      return <Standings />;
    case "fixtures":
      return <Fixtures />;
    default:
      return <Home />;
  }
}
