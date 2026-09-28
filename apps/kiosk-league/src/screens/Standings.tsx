/** §8.2 action 6: the full standings with search by name (on-screen keyboard). Also opened
 * from the idle screen, without a session. */
import { useEffect, useState } from "react";
import type { Ladder, Standing } from "../lib/api";
import { Keyboard } from "../components/Keyboard";
import { useKiosk, useT } from "../kiosk";
import { Back } from "./Home";
import { StandingRows } from "./Idle";

const LADDERS: Ladder[] = ["doubles", "singles", "pairs"];

export function Standings({ onClose }: { onClose?: () => void }) {
  const { api, fail } = useKiosk();
  const t = useT();
  const [ladder, setLadder] = useState<Ladder>("doubles");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Standing[] | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      api.standings(ladder, search).then(setRows, fail);
    }, 250);
    return () => clearTimeout(timer);
  }, [api, fail, ladder, search]);

  return (
    <section className="panel">
      {onClose ? (
        <button type="button" className="button button--quiet back" onClick={onClose}>
          ← {t("actions.back")}
        </button>
      ) : (
        <Back />
      )}
      <h1>{t("standings.title")}</h1>
      <div className="tabs" role="tablist">
        {LADDERS.map((l) => (
          <button key={l} type="button" role="tab" aria-selected={l === ladder} className="tab" onClick={() => setLadder(l)}>
            {t(`session.ladder.${l}`)}
          </button>
        ))}
      </div>
      <p className="search" aria-live="polite">
        {t("standings.search")}: <strong>{search || "…"}</strong>
      </p>
      <Keyboard value={search} onChange={setSearch} />
      {rows && rows.length === 0 ? <p className="muted">{t("standings.none")}</p> : null}
      {rows ? <StandingRows rows={rows} /> : null}
    </section>
  );
}
