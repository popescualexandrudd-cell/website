/**
 * The Payments Kiosk (§8.3). Idle: the café menu, the subscription offers, "Scan your card"
 * and the staff entry. A scan opens the customer's session (ended after a minute without a
 * touch, never while money is in the machine): check-in, pay a booking (all of it or a share
 * of the hour, R-060, R-061), debts, a subscription or its freezing, the café, vouchers and
 * the credit in the account; a fiscal receipt for every payment in cash (R-066).
 *
 * At start (and every few minutes) the page sends the server whatever the Hardware Bridge
 * signed and the server has not acknowledged yet (a power cut, a lost connection: ADR-0013),
 * and the machine's alerts (low change, cassette almost full). Without a connection to the
 * server, no new payment starts ("temporarily unavailable").
 *
 * Configuration comes from the Hardware Bridge ("hello"); in development, without a bridge,
 * from `VITE_API_URL` and `VITE_DEVICE_TOKEN`, with a keyboard-wedge scanner.
 */
import { ApiError, Offline, type Signed, SimulatorPanel, useDevice, useIdle } from "@jungle/kiosk-kit";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Card, type Idle, type Item, paymentsApi, type Session } from "./lib/api";
import { type Basket, EMPTY } from "./lib/basket";
import { errorText, type Lang, t } from "./lib/i18n";
import { CashPayment, holds, type PaymentView } from "./lib/payment";
import { KioskContext, type Participant, type PayKiosk, type Screen } from "./kiosk";
import { BasketScreen } from "./screens/Basket";
import { Cafe } from "./screens/Cafe";
import { CheckoutScreen } from "./screens/Checkout";
import { Freeze } from "./screens/Freeze";
import { Home } from "./screens/Home";
import { IdleScreen } from "./screens/Idle";
import { SplitScreen } from "./screens/Split";
import { Staff } from "./screens/Staff";
import { SubscriptionScreen } from "./screens/Subscription";
import { VoucherScreen } from "./screens/Voucher";

export const IDLE_LOGOUT_MS = 60_000;
const SYNC_EVERY_MS = 5 * 60_000;
const BRIDGE_URL = import.meta.env.VITE_BRIDGE_URL ?? "ws://127.0.0.1:8765";
const NOTES = [100, 500, 1000, 5000, 10000, 20000];
const FAULTS = [
  { device: "cash" as const, fault: "note_jam" },
  { device: "fiscal" as const, fault: "paper_out" },
];

type Message = { text: string; kind: "ok" | "error" };

function devConfig() {
  const apiUrl = import.meta.env.VITE_API_URL;
  const token = import.meta.env.VITE_DEVICE_TOKEN;
  // Only a development build may take the token from the environment: a production build is
  // a public file, and the token must never be in it.
  return import.meta.env.DEV && apiUrl && token ? { apiUrl, token } : null;
}

export function App() {
  const [lang, setLang] = useState<Lang>("ro");
  const [offline, setOffline] = useState(false);
  const [idle, setIdle] = useState<Idle | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [staffMode, setStaffMode] = useState(false);
  const [basket, setBasket] = useState<Basket>(EMPTY);
  const [splitting, setSplitting] = useState<string | null>(null);
  const [group, setGroup] = useState<Participant[]>([]);
  const [message, setMessage] = useState<Message | null>(null);
  const [payment, setPayment] = useState<CashPayment | null>(null);
  const [paymentView, setPaymentView] = useState<PaymentView | null>(null);
  const [paymentBack, setPaymentBack] = useState<Screen>("home");
  const scanHandler = useRef<((card: Card) => void) | null>(null);
  const generation = useRef(0);
  const onCardRef = useRef<(card: Card) => void>(() => undefined);
  const paymentRef = useRef<CashPayment | null>(null);
  paymentRef.current = payment;

  const { config, bridgeUp, simulator, link } = useDevice({
    bridgeUrl: BRIDGE_URL,
    devConfig: devConfig(),
    onScan: (card) => onCardRef.current(card),
    onEvent: (event) => {
      if (paymentRef.current) void paymentRef.current.onEvent(event);
      else if (event.event === "fault" && typeof event.code === "string") void apiRef.current?.alert(event.code);
    },
  });

  const api = useMemo(() => (config ? paymentsApi(config.apiUrl, config.token) : null), [config]);
  const apiRef = useRef(api);
  apiRef.current = api;

  const notify = useCallback((text: string, kind: "ok" | "error" = "ok") => setMessage({ text, kind }), []);

  const endSession = useCallback(
    (current: Session | null) => {
      generation.current += 1;
      if (current && api) void api.logout(current.session).catch(() => undefined);
      setSession(null);
      setScreen("home");
      setBasket(EMPTY);
      setSplitting(null);
      setGroup([]);
      setStaffMode(false);
      scanHandler.current = null;
      setLang("ro");
    },
    [api],
  );

  const holding = holds(paymentView);
  const { touch, secondsLeft } = useIdle(
    session !== null || staffMode,
    IDLE_LOGOUT_MS,
    () => {
      setPayment(null);
      setPaymentView(null);
      endSession(session);
    },
    holding,
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
        touch();
        if (keepScreen) return;
        setLang(opened.language === "en" ? "en" : "ro");
        setScreen("home");
        setBasket(EMPTY);
        setMessage(null);
      } catch (error) {
        fail(error);
      }
    },
    [api, fail, touch],
  );

  const onCard = useCallback(
    (card: Card) => {
      touch();
      if (scanHandler.current) scanHandler.current(card);
      else if (!staffMode && !paymentRef.current) void openSession(card);
    },
    [openSession, staffMode, touch],
  );
  onCardRef.current = onCard;

  // The idle screen (café menu) and, with it, whether the server answers.
  useEffect(() => {
    if (!api) return;
    let stop = false;
    const load = () =>
      api
        .idle()
        .then((data) => {
          if (stop) return;
          setIdle(data);
          setOffline(false);
        })
        .catch((error: unknown) => {
          if (!stop && error instanceof Offline) setOffline(true);
        });
    void load();
    const timer = setInterval(load, offline ? 5000 : 60_000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [api, offline]);

  // ADR-0013: what the bridge signed and the server has not acknowledged; the machine's alerts.
  useEffect(() => {
    if (!api || !link || !bridgeUp) return;
    const sync = async () => {
      if (paymentRef.current) return;
      try {
        const pending = await link.request("journal.pending");
        const events = (pending.events as Signed[] | undefined) ?? [];
        if (events.length) {
          const answer = await api.events(events);
          if (answer.ack) await link.order(answer.ack as Signed);
        }
        const health = await link.request("health");
        for (const code of (health.alerts as string[] | undefined) ?? []) await api.alert(code);
      } catch {
        // Offline: tried again at the next round.
      }
    };
    void sync();
    const timer = setInterval(sync, SYNC_EVERY_MS);
    return () => clearInterval(timer);
  }, [api, link, bridgeUp]);

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

  const pay = useCallback(
    (items: Item[], card?: Card, back: Screen = "home") => {
      if (!api || !link || !session) return;
      const who = card ?? { session: session.session };
      const next = new CashPayment(api, link, who, setPaymentView);
      setPayment(next);
      setPaymentBack(back);
      setScreen("checkout");
      void next.prepare(items);
    },
    [api, link, session],
  );

  const endPayment = useCallback(() => {
    const done = paymentView?.step === "done";
    setPayment(null);
    setPaymentView(null);
    if (done) setBasket(EMPTY);
    setScreen(paymentBack);
    void refresh();
  }, [paymentBack, paymentView, refresh]);

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

  const kiosk: PayKiosk = {
    lang,
    api,
    idle,
    session,
    card: session ? { session: session.session } : {},
    basket,
    setBasket,
    splitting,
    split: (bookingId) => {
      if (bookingId !== splitting) setGroup([]);
      setSplitting(bookingId);
      scanHandler.current = null;
      setScreen("split");
    },
    group,
    setGroup,
    offline,
    bridge: link,
    goto: (next) => {
      scanHandler.current = null;
      setScreen(next);
    },
    refresh,
    notify,
    fail,
    takeNextScan,
    logout: () => endSession(session),
    pay,
    payment,
    paymentView,
    paymentBack,
    endPayment,
  };

  return (
    <KioskContext.Provider value={kiosk}>
      <main className="kiosk" lang={lang}>
        <header className="topbar">
          <span className="brand">Jungle Padel · {t(lang, "title")}</span>
          {session || staffMode ? (
            <span className="topbar__session">
              {secondsLeft <= 15 && !holding ? (
                <span className="countdown" aria-live="polite">
                  {t(lang, "session.idleSoon", { seconds: secondsLeft })}
                </span>
              ) : null}
              {holding ? null : (
                <button type="button" className="button button--quiet" onClick={kiosk.logout}>
                  {t(lang, "session.logout")}
                </button>
              )}
            </span>
          ) : null}
          <button type="button" className="button button--quiet" onClick={() => setLang(lang === "ro" ? "en" : "ro")}>
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
        {staffMode ? (
          <Staff onExit={() => endSession(null)} />
        ) : session ? (
          <SessionScreens screen={screen} />
        ) : (
          <IdleScreen onStaff={() => setStaffMode(true)} />
        )}
        {simulator && link ? <SimulatorPanel link={link} notes={NOTES} faults={FAULTS} /> : null}
      </main>
    </KioskContext.Provider>
  );
}

function SessionScreens({ screen }: { screen: Screen }) {
  switch (screen) {
    case "cafe":
      return <Cafe />;
    case "basket":
      return <BasketScreen />;
    case "split":
      return <SplitScreen />;
    case "checkout":
      return <CheckoutScreen />;
    case "subscription":
      return <SubscriptionScreen />;
    case "freeze":
      return <Freeze />;
    case "voucher":
      return <VoucherScreen />;
    default:
      return <Home />;
  }
}
