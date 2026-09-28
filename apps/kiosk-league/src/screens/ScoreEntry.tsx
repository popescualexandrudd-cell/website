/** §8.2 action 2: the server found the finished bookings the player scanned into, with the
 * score window open. Pick one, split the players into teams, enter the score set by set. */
import { useState } from "react";
import type { Person } from "../lib/api";
import { formatTime } from "../lib/i18n";
import { teamsValid, toScore } from "../lib/score";
import { initialScore, ScoreEditor, type ScoreState } from "../components/ScoreEditor";
import { useKiosk, useT } from "../kiosk";
import { Back } from "./Home";

function split(players: Person[], me: string): [string[], string[]] {
  const ordered = [...players].sort((x, y) => Number(y.id === me) - Number(x.id === me));
  const half = Math.ceil(ordered.length / 2);
  return [ordered.slice(0, half).map((p) => p.id), ordered.slice(half).map((p) => p.id)];
}

export function ScoreEntry() {
  const kiosk = useKiosk();
  const { session, lang } = kiosk;
  const t = useT();
  const chances = session?.score_chances ?? [];
  const [chosen, setChosen] = useState(chances.length === 1 ? chances[0]?.booking_id ?? null : null);
  const chance = chances.find((c) => c.booking_id === chosen);
  const [teams, setTeams] = useState<[string[], string[]]>(() =>
    chance && session ? split(chance.players, session.player.id) : [[], []],
  );
  const [score, setScore] = useState<ScoreState>(initialScore);
  const [busy, setBusy] = useState(false);

  if (!session) return null;
  if (!chances.length) {
    return (
      <section className="panel">
        <Back />
        <h1>{t("score.title")}</h1>
        <p className="notice">{t("score.none")}</p>
      </section>
    );
  }
  if (!chance) {
    return (
      <section className="panel">
        <Back />
        <h1>{t("score.pick")}</h1>
        {chances.map((c) => (
          <button
            key={c.booking_id}
            type="button"
            className="tile"
            onClick={() => {
              setChosen(c.booking_id);
              setTeams(split(c.players, session.player.id));
            }}
          >
            {t("score.booking", { court: c.court, start: formatTime(lang, c.starts_at), end: formatTime(lang, c.ends_at) })}
          </button>
        ))}
      </section>
    );
  }

  const person = (id: string) => chance.players.find((p) => p.id === id);
  const move = (id: string) => {
    const [a, b] = teams;
    setTeams(a.includes(id) ? [a.filter((x) => x !== id), [...b, id]] : [[...a, id], b.filter((x) => x !== id)]);
  };
  const valid = teamsValid(teams[0], teams[1]);

  const submit = async () => {
    setBusy(true);
    try {
      await kiosk.api.propose(kiosk.card, chance.booking_id, teams[0], teams[1], toScore(score.sets, score.unfinished));
      kiosk.notify(t("score.sent"));
      await kiosk.refresh();
      kiosk.goto("home");
    } catch (error) {
      kiosk.fail(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel">
      <Back />
      <h1>{t("score.title")}</h1>
      <p className="muted">
        {t("score.booking", { court: chance.court, start: formatTime(lang, chance.starts_at), end: formatTime(lang, chance.ends_at) })}
        {" · "}
        {t("score.closes", { time: formatTime(lang, chance.window_closes_at) })}
      </p>
      <h2>{t("score.teams")}</h2>
      <p className="muted">{t("score.swap")}</p>
      <div className="teams">
        {(["teamA", "teamB"] as const).map((label, side) => (
          <div key={label} className="team">
            <h3>{t(`score.${label}`)}</h3>
            {teams[side]?.map((id) => (
              <button key={id} type="button" className="chip" onClick={() => move(id)}>
                {person(id)?.first_name} {person(id)?.last_name}
              </button>
            ))}
          </div>
        ))}
      </div>
      {!valid ? <p className="notice">{t("score.teamsInvalid")}</p> : null}
      <ScoreEditor value={score} onChange={setScore} allowUnfinished />
      <button type="button" className="button button--primary" disabled={!valid || busy} onClick={() => void submit()}>
        {t("score.submit")}
      </button>
    </section>
  );
}
