/** "Split the hour" (§8.3 flow 2, R-060, R-061): the players scan their cards, the system
 * computes the shares, each pays theirs; what is still to pay is shown live. */
import { useCallback, useEffect, useState } from "react";
import { type Participant, useKiosk, useT } from "../kiosk";
import type { Split } from "../lib/api";
import { moneyIn } from "../lib/i18n";

const REFRESH_MS = 3000;
const MAX_PARTS = 8;

export function SplitScreen() {
  const { session, lang, splitting, api, goto, takeNextScan, pay, fail, group, setGroup, offline } = useKiosk();
  const t = useT();
  const lei = moneyIn(lang);
  const [parts, setParts] = useState(4);
  const [split, setSplit] = useState<Split | null>(null);
  const [adding, setAdding] = useState(false);

  const me: Participant | null = session
    ? { name: `${session.first_name} ${session.last_name.slice(0, 1)}.`, card: { session: session.session } }
    : null;
  const players = me ? [me, ...group] : group;
  const count = Math.max(parts, players.length);

  const load = useCallback(async () => {
    if (!splitting) return;
    try {
      setSplit(await api.split(splitting, count));
    } catch (error) {
      fail(error);
    }
  }, [api, count, fail, splitting]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  // A partner scans their card: they join the group and can pay their share.
  useEffect(() => {
    if (!adding) return;
    takeNextScan(async (card) => {
      takeNextScan(null);
      setAdding(false);
      try {
        const opened = await api.session(card);
        if (session && opened.first_name === session.first_name && opened.last_name === session.last_name) return;
        setGroup([...group, { name: `${opened.first_name} ${opened.last_name.slice(0, 1)}.`, card: { session: opened.session } }]);
      } catch (error) {
        fail(error);
      }
    });
    return () => takeNextScan(null);
  }, [adding, api, fail, group, session, setGroup, takeNextScan]);

  if (!session || !splitting) return null;
  const item = session.payables.find((p) => p.subject_id === splitting) ?? session.shared.find((p) => p.subject_id === splitting);

  const payFor = (who: Participant, amount: number) =>
    pay([{ kind: "booking", subject_id: splitting, amount, cafe_lines: [] }], who.card, "split");

  return (
    <div className="home">
      <button type="button" className="button button--quiet back" onClick={() => goto("home")}>
        ← {t("actions.back")}
      </button>
      <h1>{t("split.title")}</h1>
      {item ? <p className="summary">{item.description}</p> : null}
      {split ? (
        <section className="panel split" aria-live="polite">
          <p className="total">{t("split.left", { amount: lei(split.to_pay) })}</p>
          <p className="muted">{t("split.paid", { paid: lei(split.paid), price: lei(split.price) })}</p>
          {split.to_pay === 0 ? <p className="banner banner--ok">{t("split.allPaid")}</p> : null}
        </section>
      ) : null}

      <section className="panel" aria-labelledby="parts-title">
        <h2 id="parts-title">{t("split.parts")}</h2>
        <span className="stepper">
          <button
            type="button"
            className="stepper__button"
            aria-label={t("split.fewer")}
            disabled={count <= Math.max(2, players.length)}
            onClick={() => setParts(Math.max(2, players.length, count - 1))}
          >
            −
          </button>
          <span className="stepper__value">{count}</span>
          <button
            type="button"
            className="stepper__button"
            aria-label={t("split.more")}
            disabled={count >= MAX_PARTS}
            onClick={() => setParts(Math.min(MAX_PARTS, count + 1))}
          >
            +
          </button>
        </span>
        {split ? (
          <p className="muted">{t("split.share", { amount: lei(split.shares[split.shares.length - 1] ?? 0) })}</p>
        ) : null}
      </section>

      <section className="panel" aria-labelledby="players-title">
        <h2 id="players-title">{t("split.players")}</h2>
        <ul className="plain">
          {players.map((who, index) => {
            const share = Math.min(split?.shares[index] ?? 0, split?.to_pay ?? 0);
            return (
              <li key={`${who.name}:${index}`} className="card-row payable">
                <span>{who.name}</span>
                <button
                  type="button"
                  className="button button--primary"
                  disabled={!split || share <= 0 || offline}
                  onClick={() => payFor(who, share)}
                >
                  {t("split.payShare", { name: who.name, amount: lei(share) })}
                </button>
              </li>
            );
          })}
        </ul>
        {players.length < count ? (
          <button type="button" className="button" aria-pressed={adding} onClick={() => setAdding(!adding)}>
            {adding ? t("split.scanNow") : t("split.addPlayer")}
          </button>
        ) : null}
      </section>
      {split && me && split.to_pay > 0 ? (
        <button type="button" className="button" disabled={offline} onClick={() => payFor(me, split.to_pay)}>
          {t("split.payRest", { amount: lei(split.to_pay) })}
        </button>
      ) : null}
    </div>
  );
}
