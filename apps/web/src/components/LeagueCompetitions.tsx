"use client";

/**
 * In `/cont/liga`: the tournaments open for entries (§6.14; an entry is like a booking and changes
 * nothing in the league; in pairs, the partner is named by their public page) and the visitor's
 * challenges (§6.12), which are issued and answered only at the League Kiosk: here they are shown.
 */
import { useFormatter, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";
import { CLUB_TZ } from "@/lib/live";
import * as member from "@/lib/member";
import { lei } from "@/lib/packages";
import { useErrorText } from "./useErrorText";

const CHALLENGE_STATUSES = ["pending", "accepted", "refused", "expired", "played", "cancelled"];
const LADDERS = ["doubles", "singles", "pairs"];

type Row = { tournament: member.Tournament; entry: member.TournamentEntry | null };

export function LeagueCompetitions({ locale, playerId, inLeague }: { locale: string; playerId: string; inLeague: boolean }) {
  const t = useTranslations("web.account.league");
  const format = useFormatter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [mine, setMine] = useState<member.Challenge[] | null>(null);
  const [version, setVersion] = useState(0);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [list, calls] = await Promise.all([member.tournaments(), member.challenges()]);
      const open = list.ok ? list.data.filter((x) => x.status === "registration" || x.status === "in_progress") : [];
      const entries = await Promise.all(open.map((x) => member.myEntry(x.id, playerId)));
      if (!alive) return;
      setRows(list.ok ? open.map((tournament, i) => ({ tournament, entry: entries[i] ?? null })) : null);
      setMine(calls.ok ? calls.data : null);
    })();
    return () => {
      alive = false;
    };
  }, [playerId, version]);

  const date = (iso: string) => format.dateTime(new Date(iso), { timeZone: CLUB_TZ, day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const names = (players: { first_name: string; last_name: string }[]) =>
    players.map((p) => (p.first_name || p.last_name ? `${p.first_name} ${p.last_name}`.trim() : t("retired"))).join(" / ");
  const changed = (text: string) => {
    setNotice({ text, error: false });
    setVersion((v) => v + 1);
  };

  return (
    <>
      <section className="account__card" aria-labelledby="league-tournaments" aria-busy={rows === null && notice === null}>
        <h2 id="league-tournaments" className="h3">
          {t("tournamentsTitle")}
        </h2>
        {rows === null ? (
          <p className="league__text">{t("loading")}</p>
        ) : rows.length === 0 ? (
          <p className="league__text">{t("noTournaments")}</p>
        ) : (
          <ul className="account__list">
            {rows.map(({ tournament, entry }) => (
              <TournamentItem
                key={tournament.id}
                tournament={tournament}
                entry={entry}
                canEnter={inLeague}
                date={date}
                fee={tournament.entry_fee > 0 ? t(tournament.fee_provisional ? "feeProvisional" : "fee", { amount: lei(tournament.entry_fee, locale) }) : t("free")}
                onChanged={changed}
                onError={(text) => setNotice({ text, error: true })}
              />
            ))}
          </ul>
        )}
        {notice && (
          <p className="status" data-kind={notice.error ? "error" : undefined} role={notice.error ? "alert" : "status"}>
            {notice.text}
          </p>
        )}
        <p className="events__note">{t("tournamentsNote")}</p>
      </section>

      <section className="account__card" aria-labelledby="league-challenges" aria-busy={mine === null}>
        <h2 id="league-challenges" className="h3">
          {t("challengesTitle")}
        </h2>
        {mine === null ? (
          <p className="league__text">{t("unavailableShort")}</p>
        ) : mine.length === 0 ? (
          <p className="league__text">{t("noChallenges")}</p>
        ) : (
          <ul className="account__list">
            {mine.map((c) => (
              <li key={c.id}>
                <div>
                  <strong>
                    {c.mine === "challenger" ? t("youChallenged", { names: names(c.targets) }) : t("challengedYou", { names: names(c.challengers) })}
                  </strong>
                  <span>
                    {t(`ladders.${LADDERS.includes(c.ladder) ? c.ladder : "doubles"}`)} ·{" "}
                    {t(`challengeStatuses.${CHALLENGE_STATUSES.includes(c.status) ? c.status : "pending"}`)}
                    {c.status === "pending" && ` · ${t("respondBy", { date: date(c.respond_by) })}`}
                    {c.status === "accepted" && c.play_by && ` · ${t("playBy", { date: date(c.play_by) })}`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="events__note">{t("challengesNote")}</p>
      </section>
    </>
  );
}

function TournamentItem({
  tournament,
  entry,
  canEnter,
  date,
  fee,
  onChanged,
  onError,
}: {
  tournament: member.Tournament;
  entry: member.TournamentEntry | null;
  canEnter: boolean;
  date: (iso: string) => string;
  fee: string;
  onChanged: (text: string) => void;
  onError: (text: string) => void;
}) {
  const t = useTranslations("web.account.league");
  const errorText = useErrorText();
  const [open, setOpen] = useState(false);
  const [partner, setPartner] = useState("");
  const [busy, setBusy] = useState(false);
  const pairs = tournament.team_size > 1 && !["americano", "mexicano"].includes(tournament.format);
  const registering = tournament.status === "registration" && new Date(tournament.registration_closes_at) > new Date();

  const enter = async (event: FormEvent) => {
    event.preventDefault();
    const partnerId = pairs ? member.partnerIdFrom(partner) : null;
    if (pairs && !partnerId) return onError(t("partnerMissing"));
    setBusy(true);
    const answer = await member.enterTournament(tournament.id, partnerId);
    setBusy(false);
    if (!answer.ok) return onError(errorText(answer.code, answer.params));
    setOpen(false);
    onChanged(t("entered", { name: tournament.name }));
  };

  const withdraw = async () => {
    if (!entry) return;
    setBusy(true);
    const answer = await member.withdrawEntry(entry.id);
    setBusy(false);
    if (!answer.ok) return onError(errorText(answer.code, answer.params));
    onChanged(t("withdrawnEntry", { name: tournament.name }));
  };

  return (
    <li>
      <div>
        <strong>{tournament.name}</strong>
        <span>
          {date(tournament.starts_at)} · {fee} · {t("entries", { entries: tournament.entries, max: tournament.max_entries })}
        </span>
        <span>
          {entry ? t("youAreIn") : registering ? t("closesAt", { date: date(tournament.registration_closes_at) }) : t("registrationClosed")}
        </span>
      </div>
      {entry && registering && (
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void withdraw()}>
          {t("withdrawEntry")}
        </button>
      )}
      {!entry &&
        registering &&
        canEnter &&
        (open ? (
          <form className="money__freeze" onSubmit={(event) => void enter(event)}>
            {pairs && (
              <div className="field">
                <label htmlFor={`partner-${tournament.id}`}>{t("partner")}</label>
                <input
                  id={`partner-${tournament.id}`}
                  className="input"
                  required
                  aria-describedby={`partner-hint-${tournament.id}`}
                  value={partner}
                  onChange={(e) => setPartner(e.target.value)}
                />
                <span id={`partner-hint-${tournament.id}`} className="field__hint">
                  {t("partnerHint")}
                </span>
              </div>
            )}
            <span className="account__confirm">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {t("enterConfirm")}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                {t("withdrawNo")}
              </button>
            </span>
          </form>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>
            {t("enter")}
          </button>
        ))}
    </li>
  );
}
