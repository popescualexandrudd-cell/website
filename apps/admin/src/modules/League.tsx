/**
 * The league (§6, §8.6): seasons (start, close with the final standings and rewards, rebuild the
 * standings from the event log), the matches that need a decision (disputed, expired, awaiting
 * payment: apply, reopen or cancel, always with a reason), tournaments (create, draw, cancel,
 * schedule a match on a booking, mark it finished — Q28) and the Match of the Day.
 *
 * Invariant 1: a score is entered and confirmed ONLY at the registered League Kiosk. The panel
 * never has a score field; the administrator only decides what happens to a proposed one.
 */
import { type FormEvent, useState } from "react";
import { type Schemas, unwrap } from "../api";
import { clubDay, clubMoment, toMinutes } from "../clock";
import { formatDate, formatMoney, formatTime } from "../i18n";
import { locationSlug, usePanel, useT } from "../panel";
import { ReasonAction, toBani, useData } from "../ui";

const MATCH_STATUSES = ["disputed", "expired", "awaiting_payment", "proposed", "applied", "cancelled"] as const;
const FORMATS = ["knockout", "groups_knockout", "round_robin", "americano", "mexicano", "king_of_the_court"] as const;

export function League() {
  const t = useT();
  return (
    <section aria-labelledby="league-title">
      <h1 id="league-title">{t("league.title")}</h1>
      <p className="muted">{t("league.invariant")}</p>
      <Matches />
      <Seasons />
      <Tournaments />
      <MatchOfTheDay />
    </section>
  );
}

function Matches() {
  const { api, locationId, lang, notify } = usePanel();
  const t = useT();
  const [status, setStatus] = useState<string>("disputed");
  const { data, reload } = useData(
    () => unwrap(api.client.GET("/api/v1/staff/league/matches", { params: { query: { location_id: locationId, status } } })),
    [api, locationId, status],
  );
  const resolve = async (match: Schemas["StaffMatchOut"], action: "apply" | "reopen" | "cancel", reason: string) => {
    await unwrap(api.client.POST("/api/v1/staff/league/matches/{match_id}/resolve", { params: { path: { match_id: match.id } }, body: { action, reason } }));
    notify(t(`league.resolved.${action}`));
    await reload();
  };
  return (
    <>
      <h2>{t("league.matches")}</h2>
      <div className="toolbar">
        <label>
          {t("league.status")}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {MATCH_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`league.matchStatuses.${s}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {data && data.length === 0 ? <p>{t("league.noMatches")}</p> : null}
      {(data ?? []).map((m) => (
        <article key={m.id} className="panel-box" aria-label={t("league.match", { court: m.court })}>
          <p>
            <strong>{m.court}</strong> · {formatDate(lang, m.finished_at)}, {formatTime(lang, m.finished_at)} · {t(`league.matchStatuses.${m.status}`)}
          </p>
          <ul>
            {m.players.map((p, i) => (
              <li key={i}>
                {p.first_name} {p.last_name} · {t("league.side", { side: p.side.toUpperCase() })} · {t(`league.responses.${p.response || "none"}`)}
              </li>
            ))}
          </ul>
          <p>
            {t("league.score")}: {scoreText(m.score)}
          </p>
          {m.note ? <p className="muted">{m.note}</p> : null}
          {m.transitions.length ? (
            <details>
              <summary>{t("league.history")}</summary>
              <ol>
                {m.transitions.map((tr, i) => (
                  <li key={i}>
                    {formatTime(lang, tr.at)} · {t(`league.matchStatuses.${tr.status}`)}
                    {tr.reason ? ` · ${tr.reason}` : ""}
                  </li>
                ))}
              </ol>
            </details>
          ) : null}
          {["disputed", "expired", "awaiting_payment", "proposed"].includes(m.status) ? (
            <div className="actions">
              <ReasonAction label={t("league.apply")} onConfirm={(reason) => resolve(m, "apply", reason)} />
              <ReasonAction label={t("league.reopen")} onConfirm={(reason) => resolve(m, "reopen", reason)} />
              <ReasonAction danger label={t("league.cancelMatch")} onConfirm={(reason) => resolve(m, "cancel", reason)} />
            </div>
          ) : null}
        </article>
      ))}
    </>
  );
}

/** The sets as the kiosk recorded them: {"sets": [{"a": 6, "b": 4}, …]} → "6–4, 3–6". */
export function scoreText(score: Record<string, unknown>): string {
  const sets = Array.isArray(score.sets) ? (score.sets as { a?: unknown; b?: unknown }[]) : [];
  return sets.map((s) => `${String(s.a ?? "?")}–${String(s.b ?? "?")}`).join(", ") || "—";
}

function Seasons() {
  const { api, locationId, lang, notify, fail } = usePanel();
  const t = useT();
  const { data, reload } = useData(() => unwrap(api.client.GET("/api/v1/staff/panel/league/seasons", { params: { query: { location_id: locationId } } })), [api, locationId]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ number: 1, name: "", from: clubDay(Date.now()), to: "", calibration: false });
  const act = async (id: string, action: "activate" | "close" | "rebuild") => {
    try {
      const path = { season_id: id };
      if (action === "activate") await unwrap(api.client.POST("/api/v1/staff/league/seasons/{season_id}/activate", { params: { path } }));
      if (action === "close") await unwrap(api.client.POST("/api/v1/staff/league/seasons/{season_id}/close", { params: { path } }));
      if (action === "rebuild") await unwrap(api.client.POST("/api/v1/staff/league/seasons/{season_id}/rebuild", { params: { path } }));
      notify(t(`league.seasonDone.${action}`));
      await reload();
    } catch (error) {
      fail(error);
    }
  };
  const create = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await unwrap(
        api.client.POST("/api/v1/staff/league/seasons", {
          body: {
            location_id: locationId,
            number: draft.number,
            name: draft.name.trim(),
            starts_at: clubMoment(draft.from, 0),
            ends_at: clubMoment(draft.to, 0),
            is_calibration: draft.calibration,
          },
        }),
      );
      notify(t("saved"));
      setAdding(false);
      await reload();
    } catch (error) {
      fail(error);
    }
  };
  return (
    <>
      <h2>{t("league.seasons")}</h2>
      <div className="toolbar">
        <button type="button" className="button" onClick={() => setAdding(!adding)}>
          {t("league.newSeason")}
        </button>
      </div>
      {adding ? (
        <form className="inline-form" onSubmit={(e) => void create(e)} aria-label={t("league.newSeason")}>
          <label>
            {t("league.number")}
            <input type="number" min={0} max={1000} required value={draft.number} onChange={(e) => setDraft({ ...draft, number: Number(e.target.value) })} />
          </label>
          <label>
            {t("league.name")}
            <input required maxLength={120} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label>
            {t("league.from")}
            <input type="date" required value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
          </label>
          <label>
            {t("league.to")}
            <input type="date" required value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
          </label>
          <label className="check">
            <input type="checkbox" checked={draft.calibration} onChange={(e) => setDraft({ ...draft, calibration: e.target.checked })} />
            {t("league.calibration")}
          </label>
          <button type="submit" className="button button--primary">
            {t("league.create")}
          </button>
        </form>
      ) : null}
      <table className="table">
        <tbody>
          {(data ?? []).map((s) => (
            <tr key={s.id}>
              <th scope="row">
                {s.name}
                {s.is_calibration ? <span className="muted"> · {t("league.calibrationShort")}</span> : null}
              </th>
              <td>
                {formatDate(lang, s.starts_at)} – {formatDate(lang, s.ends_at)}
              </td>
              <td>{t(`league.seasonStatuses.${s.status}`)}</td>
              <td>
                <div className="actions">
                  {s.status === "planned" ? (
                    <button type="button" className="button" onClick={() => void act(s.id, "activate")}>
                      {t("league.activate")}
                    </button>
                  ) : null}
                  {s.status === "active" ? (
                    <button type="button" className="button button--danger" onClick={() => void act(s.id, "close")}>
                      {t("league.close")}
                    </button>
                  ) : null}
                  {s.status !== "planned" ? (
                    <button type="button" className="button button--quiet" onClick={() => void act(s.id, "rebuild")}>
                      {t("league.rebuild")}
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Tournaments() {
  const { api, locationId, permissions, lang, notify, fail } = usePanel();
  const t = useT();
  const slug = locationSlug(permissions, locationId);
  const { data, reload } = useData(() => unwrap(api.client.GET("/api/v1/league/tournaments", { params: { query: { location: slug } } })), [api, slug]);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", format: "knockout", team_size: 2, day: clubDay(Date.now()), time: "10:00", closes: clubDay(Date.now()), fee: "0", max: 16 });
  const create = async (event: FormEvent) => {
    event.preventDefault();
    const fee = toBani(draft.fee);
    if (fee === null) return fail(new Error("fee"));
    try {
      await unwrap(
        api.client.POST("/api/v1/staff/league/tournaments", {
          body: {
            location_id: locationId,
            name: draft.name.trim(),
            format: draft.format,
            team_size: draft.team_size,
            starts_at: clubMoment(draft.day, toMinutes(draft.time)),
            registration_closes_at: clubMoment(draft.closes, 23 * 60 + 59),
            entry_fee: fee,
            max_entries: draft.max,
            seeding: "rank",
            group_size: 4,
            advance: 2,
            rounds: 5,
          },
        }),
      );
      notify(t("saved"));
      setAdding(false);
      await reload();
    } catch (error) {
      fail(error);
    }
  };
  return (
    <>
      <h2>{t("league.tournaments")}</h2>
      <div className="toolbar">
        <button type="button" className="button" onClick={() => setAdding(!adding)}>
          {t("league.newTournament")}
        </button>
      </div>
      {adding ? (
        <form className="inline-form" onSubmit={(e) => void create(e)} aria-label={t("league.newTournament")}>
          <label>
            {t("league.name")}
            <input required maxLength={120} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label>
            {t("league.format")}
            <select value={draft.format} onChange={(e) => setDraft({ ...draft, format: e.target.value })}>
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {t(`league.formats.${f}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("league.teamSize")}
            <select value={draft.team_size} onChange={(e) => setDraft({ ...draft, team_size: Number(e.target.value) })}>
              <option value={2}>{t("league.doubles")}</option>
              <option value={1}>{t("league.singles")}</option>
            </select>
          </label>
          <label>
            {t("league.startsOn")}
            <input type="date" required value={draft.day} onChange={(e) => setDraft({ ...draft, day: e.target.value })} />
          </label>
          <label>
            {t("league.time")}
            <input type="time" required value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />
          </label>
          <label>
            {t("league.closes")}
            <input type="date" required value={draft.closes} onChange={(e) => setDraft({ ...draft, closes: e.target.value })} />
          </label>
          <label>
            {t("league.fee")}
            <input inputMode="decimal" required value={draft.fee} onChange={(e) => setDraft({ ...draft, fee: e.target.value })} />
          </label>
          <label>
            {t("league.max")}
            <input type="number" min={2} max={128} required value={draft.max} onChange={(e) => setDraft({ ...draft, max: Number(e.target.value) })} />
          </label>
          <button type="submit" className="button button--primary">
            {t("league.create")}
          </button>
        </form>
      ) : null}
      <table className="table">
        <tbody>
          {(data ?? []).map((tour) => (
            <tr key={tour.id}>
              <th scope="row">
                <button type="button" className="link" onClick={() => setOpen(open === tour.id ? null : tour.id)}>
                  {tour.name}
                </button>
              </th>
              <td>{t(`league.formats.${tour.format}`)}</td>
              <td>
                {formatDate(lang, tour.starts_at)}, {formatTime(lang, tour.starts_at)}
              </td>
              <td>{t("league.entries", { count: tour.entries, max: tour.max_entries })}</td>
              <td>
                {formatMoney(lang, tour.entry_fee)}
                {tour.fee_provisional ? " · DE_STABILIT" : ""}
              </td>
              <td>{t(`league.tournamentStatuses.${tour.status}`)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {open ? <TournamentDetail id={open} onChanged={reload} /> : null}
    </>
  );
}

function TournamentDetail({ id, onChanged }: { id: string; onChanged: () => Promise<void> }) {
  const { api, lang, notify, fail } = usePanel();
  const t = useT();
  const { data, reload } = useData(() => unwrap(api.client.GET("/api/v1/league/tournaments/{tournament_id}", { params: { path: { tournament_id: id } } })), [api, id]);
  const [booking, setBooking] = useState<Record<string, string>>({});
  const run = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      notify(message);
      await reload();
      await onChanged();
    } catch (error) {
      fail(error);
    }
  };
  if (!data) return <p>{t("loading")}</p>;
  const path = { tournament_id: id };
  const names = (players: { first_name: string; last_name: string }[]) => players.map((p) => `${p.first_name} ${p.last_name}`).join(" / ") || "—";
  return (
    <div className="panel-box" role="region" aria-label={data.name}>
      <h3>{data.name}</h3>
      {data.status === "registration" ? (
        <div className="actions">
          <button type="button" className="button button--primary" onClick={() => void run(() => unwrap(api.client.POST("/api/v1/staff/league/tournaments/{tournament_id}/draw", { params: { path } })), t("league.drawn"))}>
            {t("league.draw")}
          </button>
        </div>
      ) : null}
      {data.status === "registration" || data.status === "in_progress" ? (
        <ReasonAction
          danger
          label={t("league.cancelTournament")}
          onConfirm={async (reason) => {
            await unwrap(api.client.POST("/api/v1/staff/league/tournaments/{tournament_id}/cancel", { params: { path }, body: { reason } }));
            notify(t("league.tournamentCancelled"));
            await reload();
            await onChanged();
          }}
        />
      ) : null}
      <h4>{t("league.entriesTitle")}</h4>
      <ol>
        {data.entries_list.map((e) => (
          <li key={e.id}>
            {names(e.players)}
            {e.seed ? ` · ${t("league.seed", { seed: e.seed })}` : ""}
          </li>
        ))}
      </ol>
      {data.fixtures.length ? (
        <>
          <h4>{t("league.fixtures")}</h4>
          <table className="table">
            <tbody>
              {data.fixtures.map((f) => (
                <tr key={f.id}>
                  <th scope="row">
                    {t("league.round", { round: f.round, slot: f.slot })}
                  </th>
                  <td>
                    {names(f.team_a)} – {names(f.team_b)}
                  </td>
                  <td>{f.starts_at ? `${f.court}, ${formatDate(lang, f.starts_at)} ${formatTime(lang, f.starts_at)}` : t("league.unscheduled")}</td>
                  <td>
                    {f.status === "waiting" || f.status === "ready" ? (
                      <div className="amount-form">
                        <label>
                          {t("league.bookingId")}
                          <input value={booking[f.id] ?? ""} onChange={(e) => setBooking({ ...booking, [f.id]: e.target.value.trim() })} />
                        </label>
                        <button
                          type="button"
                          className="button"
                          disabled={!booking[f.id]}
                          onClick={() =>
                            void run(
                              () => unwrap(api.client.POST("/api/v1/staff/league/fixtures/{fixture_id}/schedule", { params: { path: { fixture_id: f.id } }, body: { booking_id: booking[f.id] ?? "" } })),
                              t("league.scheduled"),
                            )
                          }
                        >
                          {t("league.schedule")}
                        </button>
                      </div>
                    ) : null}
                    {f.status === "ready" && f.starts_at ? (
                      <button
                        type="button"
                        className="button"
                        onClick={() => void run(() => unwrap(api.client.POST("/api/v1/staff/league/fixtures/{fixture_id}/finished", { params: { path: { fixture_id: f.id } } })), t("league.finishedDone"))}
                      >
                        {t("league.finished")}
                      </button>
                    ) : null}
                    {f.winner ? <span>{t("league.winner", { side: f.winner.toUpperCase() })}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </div>
  );
}

function MatchOfTheDay() {
  const { api, locationId, permissions, notify } = usePanel();
  const t = useT();
  const slug = locationSlug(permissions, locationId);
  const { data, reload } = useData(() => unwrap(api.client.GET("/api/v1/league/match-of-the-day", { params: { query: { location: slug } } })), [api, slug]);
  const [booking, setBooking] = useState("");
  return (
    <>
      <h2>{t("league.spotlight")}</h2>
      <p>
        {data?.found
          ? `${data.court} · ${data.players.map((p) => `${p.first_name} ${p.last_name}`).join(", ")}${data.chosen_by_admin ? ` · ${t("league.chosen")}` : ""}`
          : t("league.noSpotlight")}
      </p>
      <ReasonAction
        label={t("league.choose")}
        onConfirm={async (reason) => {
          await unwrap(api.client.POST("/api/v1/staff/league/match-of-the-day", { body: { location_id: locationId, booking_id: booking, reason } }));
          notify(t("saved"));
          await reload();
        }}
      >
        <label>
          {t("league.bookingId")}
          <input required value={booking} onChange={(e) => setBooking(e.target.value.trim())} />
        </label>
      </ReasonAction>
    </>
  );
}
