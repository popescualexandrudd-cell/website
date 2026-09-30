"use client";

/**
 * `/cont/liga` (§6.15, R-012): the league seen by the player alone: rank, level, LP and place in
 * each ladder, the latest LP changes, the badges (private), the steps still missing to join, and the
 * league's GDPR consent (signed only at the League Kiosk; withdrawn from here). Read-only: scores are
 * entered and confirmed exclusively at the League Kiosk (invariant 1).
 */
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { CLUB_TZ } from "@/lib/live";
import * as member from "@/lib/member";
import { MemberOnly } from "./useMember";
import { LeagueCompetitions } from "./LeagueCompetitions";
import { useErrorText } from "./useErrorText";

const LADDERS = ["doubles", "singles", "pairs"];
const TIERS = ["bronze", "silver", "gold", "platinum", "diamond", "master"];
const KINDS = ["match", "bonus", "decay", "register", "cancel"];
const BADGES = ["giant_slayer", "promotion", "first_diamond", "win_streak", "early_bird", "weekly_streak", "upset_of_week", "king"];

export function AccountLeague({ locale }: { locale: string }) {
  return <MemberOnly>{(me) => <LeaguePanel locale={locale} playerId={me.id} />}</MemberOnly>;
}

function LeaguePanel({ locale, playerId }: { locale: string; playerId: string }) {
  const t = useTranslations("web.account.league");
  const format = useFormatter();
  const errorText = useErrorText();
  const [data, setData] = useState<member.LeagueMe | null>(null);
  const [consent, setConsent] = useState<member.Consent | null>(null);
  const [failed, setFailed] = useState(false);
  const [asking, setAsking] = useState(false);
  const [notice, setNotice] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    void Promise.all([member.leagueMe(), member.consent(locale)]).then(([me, c]) => {
      if (!alive) return;
      if (me.ok) setData(me.data);
      setConsent(c.ok ? c.data : null);
      setFailed(!me.ok);
    });
    return () => {
      alive = false;
    };
  }, [locale, version]);

  const withdraw = async () => {
    setAsking(false);
    const answer = await member.withdrawConsent();
    if (!answer.ok) return setNotice(errorText(answer.code, answer.params));
    setNotice(t("withdrawn"));
    setVersion((v) => v + 1);
  };

  if (failed)
    return (
      <p className="status" data-kind="error" role="alert">
        {t("unavailable")}
      </p>
    );
  if (!data)
    return (
      <p className="status" aria-live="polite">
        {t("loading")}
      </p>
    );

  const level = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const rank = (tier: string, division: string) =>
    tier === "master" ? t("tiers.master") : `${TIERS.includes(tier) ? t(`tiers.${tier}`) : tier} ${division}`;
  const date = (iso: string) => format.dateTime(new Date(iso), { timeZone: CLUB_TZ, day: "numeric", month: "long" });
  const steps = [
    { key: "adult", done: data.adult },
    { key: "questionnaire", done: data.questionnaire === "validated", pending: data.questionnaire === "pending" },
    { key: "consent", done: data.consent_signed },
  ];

  return (
    <div className="account">
      <section className="account__card" aria-labelledby="league-me">
        <h2 id="league-me" className="h3">
          {data.in_league ? t("inLeague") : t("notYet")}
        </h2>
        {data.ladders.length > 0 ? (
          <ul className="account__list">
            {data.ladders.map((ladder) => (
              <li key={ladder.ladder}>
                <div>
                  <strong>
                    {t(`ladders.${LADDERS.includes(ladder.ladder) ? ladder.ladder : "doubles"}`)} · {rank(ladder.tier, ladder.division)} · {t("lp", { lp: ladder.lp })}
                  </strong>
                  <span>
                    {t("level", { level: level.format(ladder.level) })} ·{" "}
                    {ladder.placement_left > 0
                      ? t("placement", { left: ladder.placement_left })
                      : ladder.position !== null && ladder.position !== undefined
                        ? t("position", { position: ladder.position })
                        : t("noPosition")}{" "}
                    · {t("played", { count: ladder.matches_played })}
                    {!ladder.eligible && ` · ${t("belowMinimum")}`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="league__text">{data.in_league ? t("noLadders") : t("joinLead")}</p>
        )}
        {!data.in_league && (
          <ol className="league-steps">
            {steps.map((step) => (
              <li key={step.key} data-done={step.done ? "true" : undefined}>
                <strong>{t(`steps.${step.key}.title`)}</strong> · {step.done ? t("done") : step.pending ? t("pending") : t(`steps.${step.key}.todo`)}
              </li>
            ))}
          </ol>
        )}
        <p className="account__actions">
          {data.in_league && (
            <Link className="btn btn-secondary" href={{ pathname: "/league/players/[id]", params: { id: playerId } }}>
              {t("publicPage")}
            </Link>
          )}
          <Link className="btn btn-secondary" href="/league">
            {t("standings")}
          </Link>
        </p>
        <p className="events__note">{t("kioskOnly")}</p>
      </section>

      <LeagueCompetitions locale={locale} playerId={playerId} inLeague={data.in_league} />

      <section className="account__card" aria-labelledby="league-recent">
        <h2 id="league-recent" className="h3">
          {t("recentTitle")}
        </h2>
        {data.recent.length === 0 ? (
          <p className="league__text">{t("noRecent")}</p>
        ) : (
          <ul className="account__list">
            {data.recent.map((change, index) => (
              <li key={`${change.at}-${change.ladder}-${index}`}>
                <div>
                  <strong>{t(`kinds.${KINDS.includes(change.kind) ? change.kind : "match"}`)}</strong>
                  <span>
                    {date(change.at)} · {t(`ladders.${LADDERS.includes(change.ladder) ? change.ladder : "doubles"}`)}
                  </span>
                </div>
                <span className="money__delta">{t("lp", { lp: (change.lp_delta > 0 ? "+" : change.lp_delta < 0 ? "−" : "") + Math.abs(change.lp_delta) })}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="account__card" aria-labelledby="league-badges">
        <h2 id="league-badges" className="h3">
          {t("badgesTitle")}
        </h2>
        {data.badges.length === 0 ? (
          <p className="league__text">{t("noBadges")}</p>
        ) : (
          <ul className="account__list">
            {data.badges.map((badge) => (
              <li key={`${badge.code}-${badge.key}`}>
                <div>
                  <strong>{BADGES.includes(badge.code) ? t(`badges.${badge.code}`) : badge.code}</strong>
                  <span>{date(badge.awarded_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="events__note">{t("badgesPrivate")}</p>
      </section>

      <section className="account__card" aria-labelledby="league-consent">
        <h2 id="league-consent" className="h3">
          {t("consentTitle")}
        </h2>
        {consent === null ? (
          <p className="league__text">{t("unavailable")}</p>
        ) : consent.signed ? (
          <>
            <p className="league__text">
              {t("consentSigned", { date: consent.signed_at ? date(consent.signed_at) : "–" })}
              {consent.outdated && ` ${t("consentOutdated")}`}
            </p>
            {asking ? (
              <p className="account__confirm">
                <span>{t("withdrawAsk")}</span>
                <button type="button" className="btn btn-secondary" onClick={() => void withdraw()}>
                  {t("withdrawYes")}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setAsking(false)}>
                  {t("withdrawNo")}
                </button>
              </p>
            ) : (
              <p className="account__actions">
                <button type="button" className="btn btn-secondary" onClick={() => setAsking(true)}>
                  {t("withdraw")}
                </button>
              </p>
            )}
          </>
        ) : (
          <p className="league__text">{t("consentMissing")}</p>
        )}
        {notice && (
          <p className="status" role="status">
            {notice}
          </p>
        )}
      </section>
    </div>
  );
}
