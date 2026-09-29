/** Q55 (the owner's answer, 29.09.2026): the four players on a court choose who plays with
 * whom; the court screen follows at once. By default the screen pairs them by the order of
 * their scans. Not for a match already entered, a tournament match or a challenge. */
import { useEffect, useState } from "react";
import type { Lineup } from "../lib/api";
import { formatTime } from "../lib/i18n";
import { useKiosk, useT } from "../kiosk";
import { Back } from "./Home";

export function Teams() {
  const kiosk = useKiosk();
  const t = useT();
  const [courts, setCourts] = useState<Lineup[] | null>(null);
  const [busy, setBusy] = useState(false);
  const me = kiosk.session?.player.id;

  useEffect(() => {
    let stop = false;
    kiosk.api
      .lineups(kiosk.card)
      .then((found) => {
        if (!stop) setCourts(found);
      })
      .catch((error: unknown) => {
        if (!stop) {
          setCourts([]);
          kiosk.fail(error);
        }
      });
    return () => {
      stop = true;
    };
    // Loaded once when the screen opens; a choice below updates it.
  }, []);

  const choose = async (court: Lineup, partnerId: string) => {
    setBusy(true);
    try {
      const chosen = await kiosk.api.choosePartner(court.booking_id, kiosk.card, partnerId);
      setCourts((list) => (list ?? []).map((c) => (c.booking_id === chosen.booking_id ? chosen : c)));
      kiosk.notify(t("teams.done"));
    } catch (error) {
      kiosk.fail(error);
    } finally {
      setBusy(false);
    }
  };

  const nameOf = (court: Lineup, id: string) => {
    const person = court.players.find((p) => p.id === id);
    return person ? `${person.first_name} ${person.last_name}` : "";
  };

  return (
    <section className="panel">
      <Back />
      <h1>{t("teams.title")}</h1>
      {courts === null ? <p className="muted">{t("teams.loading")}</p> : null}
      {courts?.length === 0 ? <p className="notice">{t("teams.none")}</p> : null}
      {(courts ?? []).map((court) => {
        const mine = court.teams.find((team) => team.includes(me ?? ""));
        return (
          <article key={court.booking_id} className="card-row" aria-label={court.court}>
            <p className="summary">
              <strong>{court.court}</strong>{" "}
              <span className="muted">
                {formatTime(kiosk.lang, court.starts_at)}–{formatTime(kiosk.lang, court.ends_at)}
              </span>
            </p>
            <p className="summary" aria-label={t("teams.now")}>
              {court.teams.map((team) => team.map((id) => nameOf(court, id)).join(" & ")).join(` ${t("idle.vs")} `)}
            </p>
            <p className="muted">{t("teams.question")}</p>
            <div className="actions">
              {court.players
                .filter((p) => p.id !== me)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={mine?.includes(p.id) ? "button button--primary" : "button"}
                    aria-pressed={mine?.includes(p.id) ?? false}
                    disabled={busy}
                    onClick={() => void choose(court, p.id)}
                  >
                    {p.first_name} {p.last_name}
                  </button>
                ))}
            </div>
          </article>
        );
      })}
    </section>
  );
}
