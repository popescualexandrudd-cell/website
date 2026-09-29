/** Staff mode (§8.3, Q54): the employee's card, then their PIN; then the cash box: refill the
 * change, empty the cassette, count, close the day with the register's Z report; the machine's
 * state and alerts. Every operation is a command the server signs; the bridge reports back,
 * signed, what it did, and only that is recorded (R-064). */
import { NumPad, type Signed } from "@jungle/kiosk-kit";
import { useCallback, useEffect, useRef, useState } from "react";
import { useKiosk, useT } from "../kiosk";
import type { Card, Operation, OperationKind } from "../lib/api";
import { formatTime, moneyIn } from "../lib/i18n";

const REFILL_VALUES = [100, 500, 1000, 5000];
const REFILL_STEP = 10;
const REFILL_MAX = 500;

type Health = { levels: Record<string, number>; alerts: string[] };

export function Staff({ onExit }: { onExit: () => void }) {
  const { api, bridge, lang, takeNextScan, notify, fail } = useKiosk();
  const t = useT();
  const lei = moneyIn(lang);
  const [staffCard, setStaffCard] = useState<Card | null>(null);
  const [pin, setPin] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [operations, setOperations] = useState<Operation[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [refill, setRefill] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  // 1. The employee's card.
  useEffect(() => {
    if (staffCard) return;
    takeNextScan((card) => setStaffCard(card));
    return () => takeNextScan(null);
  }, [staffCard, takeNextScan]);

  // The staff session ends with this screen.
  useEffect(
    () => () => {
      if (tokenRef.current) void api.staffLogout(tokenRef.current).catch(() => undefined);
    },
    [api],
  );

  const reload = useCallback(async () => {
    if (!token) return;
    try {
      setOperations(await api.operations(token));
      if (bridge) {
        const state = await bridge.request("health");
        if (state.ok) {
          setHealth({
            levels: (state.cash_levels as Record<string, number> | undefined) ?? {},
            alerts: (state.alerts as string[] | undefined) ?? [],
          });
        }
      }
    } catch (error) {
      fail(error);
    }
  }, [api, bridge, fail, token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // 2. The PIN.
  const login = async () => {
    if (!staffCard) return;
    setBusy(true);
    try {
      const opened = await api.staffLogin(staffCard, pin);
      setToken(opened.token);
      setName(opened.first_name);
    } catch (error) {
      fail(error);
      setPin("");
    } finally {
      setBusy(false);
    }
  };

  // 3. An operation: the server signs, the bridge does it and signs what it did.
  const run = async (kind: OperationKind, notes?: Record<string, number>) => {
    if (!token || !bridge) return;
    setBusy(true);
    try {
      const started = await api.operation(token, kind, notes);
      const done = await bridge.order(started.command as Signed);
      if (!done.ok || !done.signed) {
        notify(t("staff.bridgeRefused", { error: String(done.error ?? "") }), "error");
        return;
      }
      const answer = await api.events([done.signed as Signed]);
      if (answer.ack) await bridge.order(answer.ack as Signed);
      notify(t(`staff.done.${kind}`));
      setRefill({});
      await reload();
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    if (token) await api.staffLogout(token).catch(() => undefined);
    setToken(null);
    onExit();
  };

  if (!staffCard) {
    return (
      <div className="home kiosk--center">
        <h1>{t("staff.title")}</h1>
        <p className="scan-call__title">{t("staff.scanCard")}</p>
        <button type="button" className="button" onClick={onExit}>
          {t("actions.back")}
        </button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="home kiosk--center">
        <h1>{t("staff.title")}</h1>
        <p>{t("staff.pin")}</p>
        <NumPad value={pin} onChange={setPin} label={t("staff.pinLabel")} clear={t("keyboard.clear")} secret />
        <div className="actions">
          <button type="button" className="button button--primary" disabled={pin.length !== 6 || busy} onClick={() => void login()}>
            {t("staff.login")}
          </button>
          <button type="button" className="button" onClick={onExit}>
            {t("actions.back")}
          </button>
        </div>
      </div>
    );
  }

  const refillNotes = Object.fromEntries(
    Object.entries(refill)
      .filter(([, count]) => count > 0)
      .map(([value, count]) => [value, count]),
  );
  const refillTotal = Object.entries(refillNotes).reduce((sum, [value, count]) => sum + Number(value) * count, 0);

  return (
    <div className="home">
      <h1>{t("staff.hello", { name })}</h1>
      <div className="actions">
        <button type="button" className="button button--quiet" onClick={() => void logout()}>
          {t("staff.logout")}
        </button>
      </div>

      <section className="panel" aria-labelledby="machine-title">
        <h2 id="machine-title">{t("staff.machine")}</h2>
        {health ? (
          <>
            <ul className="price-list">
              {Object.entries(health.levels).map(([value, count]) => (
                <li key={value}>
                  <span>{lei(Number(value))}</span>
                  <span>{t("staff.notes", { count })}</span>
                </li>
              ))}
            </ul>
            {health.alerts.map((alert) => (
              <p key={alert} className="notice" role="alert">
                {t(`faults.${alert}`)}
              </p>
            ))}
          </>
        ) : (
          <p className="muted">{t("staff.noMachine")}</p>
        )}
      </section>

      <section className="panel" aria-labelledby="refill-title">
        <h2 id="refill-title">{t("staff.refill")}</h2>
        {REFILL_VALUES.map((value) => {
          const count = refill[value] ?? 0;
          return (
            <div key={value} className="set__row">
              <span className="refill__value">{lei(value)}</span>
              <span className="stepper">
                <button
                  type="button"
                  className="stepper__button"
                  aria-label={t("staff.fewerNotes", { value: lei(value) })}
                  disabled={count <= 0}
                  onClick={() => setRefill({ ...refill, [value]: Math.max(0, count - REFILL_STEP) })}
                >
                  −
                </button>
                <span className="stepper__value">{count}</span>
                <button
                  type="button"
                  className="stepper__button"
                  aria-label={t("staff.moreNotes", { value: lei(value) })}
                  disabled={count >= REFILL_MAX}
                  onClick={() => setRefill({ ...refill, [value]: Math.min(REFILL_MAX, count + REFILL_STEP) })}
                >
                  +
                </button>
              </span>
            </div>
          );
        })}
        <button type="button" className="button button--primary" disabled={refillTotal === 0 || busy} onClick={() => void run("refill", refillNotes)}>
          {t("staff.refillSubmit", { amount: lei(refillTotal) })}
        </button>
      </section>

      <div className="tiles">
        <button type="button" className="tile" disabled={busy} onClick={() => void run("empty")}>
          {t("staff.empty")}
        </button>
        <button type="button" className="tile" disabled={busy} onClick={() => void run("count")}>
          {t("staff.count")}
        </button>
        <button type="button" className="tile" disabled={busy} onClick={() => void run("day_close")}>
          {t("staff.dayClose")}
        </button>
      </div>

      <section className="panel" aria-labelledby="ops-title">
        <h2 id="ops-title">{t("staff.recent")}</h2>
        {operations.length === 0 ? <p className="muted">{t("staff.none")}</p> : null}
        <ul className="plain">
          {operations.map((op) => (
            <li key={op.id} className="card-row">
              <p>
                {formatTime(lang, op.created_at)} · {t(`staff.kinds.${op.kind}`)}
                {op.amount !== null && op.amount !== undefined && op.kind !== "day_close" ? ` · ${lei(op.amount)}` : ""}
                {op.completed_at ? "" : ` · ${t("staff.waiting")}`}
              </p>
              {op.kind === "count" && op.difference !== null && op.difference !== undefined ? (
                <p className={op.difference === 0 ? "muted" : "notice"}>
                  {op.difference === 0
                    ? t("staff.countOk", { ledger: lei(op.ledger_amount ?? 0) })
                    : t("staff.countDifference", { difference: lei(op.difference), ledger: lei(op.ledger_amount ?? 0) })}
                </p>
              ) : null}
              {op.kind === "day_close" && op.result.day ? <DayClose day={op.result.day as Record<string, number>} /> : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function DayClose({ day }: { day: Record<string, number> }) {
  const { lang } = useKiosk();
  const t = useT();
  const lei = moneyIn(lang);
  return (
    <ul className="price-list">
      {["received", "change_given", "moved_to_or_from_safe", "in_box"].map((key) => (
        <li key={key}>
          <span>{t(`staff.day.${key}`)}</span>
          <span>{lei(day[key] ?? 0)}</span>
        </li>
      ))}
    </ul>
  );
}
