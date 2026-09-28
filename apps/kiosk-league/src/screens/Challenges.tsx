/** §8.2 action 4 (Q48): answer the challenges received; issue a new one. A pair's partner
 * scans their card; the opponents are picked from the standings. */
import { useEffect, useState } from "react";
import type { Card, Standing } from "../lib/api";
import { formatTime } from "../lib/i18n";
import { useKiosk, useT } from "../kiosk";
import { Back } from "./Home";
import { names } from "./Idle";

function IssueChallenge({ onDone }: { onDone: () => void }) {
  const kiosk = useKiosk();
  const { api, session, takeNextScan, fail } = kiosk;
  const t = useT();
  const [partner, setPartner] = useState<{ card: Card; session: string; name: string } | null>(null);
  const [alone, setAlone] = useState(false);
  const [rows, setRows] = useState<Standing[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const deciding = !partner && !alone;
  const needed = partner ? 2 : 1;

  // While the partner is expected, the next scan is theirs (not a new session for the kiosk):
  // it opens their own short session, used for the challenge and closed right after.
  useEffect(() => {
    if (!deciding) return;
    takeNextScan((card) => {
      api.session(card).then((theirs) => {
        const name = `${theirs.player.first_name} ${theirs.player.last_name}`;
        setPartner({ card: { session: theirs.session }, session: theirs.session, name });
      }, fail);
    });
    return () => takeNextScan(null);
  }, [api, deciding, fail, takeNextScan]);

  useEffect(() => {
    if (!partner) return;
    return () => {
      void api.logout(partner.session).catch(() => undefined);
    };
  }, [api, partner]);

  useEffect(() => {
    if (deciding) return;
    api.standings(partner ? "doubles" : "singles", "").then(setRows, fail);
  }, [api, deciding, fail, partner]);

  if (!session) return null;
  const mine = new Set([session.player.id]);
  const candidates = rows.flatMap((r) => r.players).filter((p) => p.id && !mine.has(p.id) && p.first_name);

  const send = async () => {
    setBusy(true);
    try {
      const cards = partner ? [kiosk.card, partner.card] : [kiosk.card];
      await api.issueChallenge(cards, picked);
      kiosk.notify(t("challenges.sent"));
      onDone();
    } catch (error) {
      kiosk.fail(error);
    } finally {
      setBusy(false);
    }
  };

  if (deciding) {
    return (
      <div className="notice">
        <p>{t("challenges.partner")}</p>
        <button type="button" className="button" onClick={() => setAlone(true)}>
          {t("challenges.alone")}
        </button>
      </div>
    );
  }
  return (
    <div>
      {partner ? <p>{t("challenges.partnerScanned", { name: partner.name })}</p> : null}
      <h2>{t("challenges.pickOpponents", { count: needed })}</h2>
      <div className="chips">
        {candidates.map((p) => {
          const id = p.id ?? "";
          const on = picked.includes(id);
          return (
            <button
              key={id}
              type="button"
              className={`chip${on ? " chip--on" : ""}`}
              aria-pressed={on}
              onClick={() => setPicked(on ? picked.filter((x) => x !== id) : [...picked, id].slice(-needed))}
            >
              {p.first_name} {p.last_name}
            </button>
          );
        })}
      </div>
      <button type="button" className="button button--primary" disabled={picked.length !== needed || busy} onClick={() => void send()}>
        {t("challenges.send")}
      </button>
    </div>
  );
}

export function Challenges() {
  const kiosk = useKiosk();
  const t = useT();
  const [issuing, setIssuing] = useState(false);
  const [busy, setBusy] = useState(false);
  const received = kiosk.session?.challenges ?? [];

  const answer = async (id: string, accept: boolean) => {
    setBusy(true);
    try {
      await kiosk.api.answerChallenge(id, kiosk.card, accept);
      kiosk.notify(t(accept ? "challenges.accepted" : "challenges.refused"));
      await kiosk.refresh();
    } catch (error) {
      kiosk.fail(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel">
      <Back />
      <h1>{t("challenges.title")}</h1>
      <h2>{t("challenges.received")}</h2>
      {received.length === 0 ? <p className="muted">{t("challenges.none")}</p> : null}
      {received.map((c) => (
        <article key={c.challenge_id} className="card-row">
          <p>{t("challenges.from", { names: names(c.challengers) })}</p>
          <p className="muted">{t("challenges.until", { time: formatTime(kiosk.lang, c.respond_by) })}</p>
          <div className="actions">
            <button type="button" className="button button--primary" disabled={busy} onClick={() => void answer(c.challenge_id, true)}>
              {t("challenges.accept")}
            </button>
            <button type="button" className="button button--danger" disabled={busy} onClick={() => void answer(c.challenge_id, false)}>
              {t("challenges.refuse")}
            </button>
          </div>
        </article>
      ))}
      <h2>{t("challenges.new")}</h2>
      {issuing ? (
        <IssueChallenge onDone={() => setIssuing(false)} />
      ) : (
        <button type="button" className="button" onClick={() => setIssuing(true)}>
          {t("challenges.new")}
        </button>
      )}
    </section>
  );
}
