"use client";

/**
 * `/cont/card` (R-020 … R-022): the member card with its QR code, Apple and Google Wallet when the
 * club has turned them on, and "I lost my card" (the old code is blocked at once, a new one issued).
 * The QR code is a random token (no personal data); it is shown as an image, never as markup.
 */
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import * as member from "@/lib/member";
import { CLUB_TZ } from "@/lib/live";
import { MemberOnly } from "./useMember";
import { useErrorText } from "./useErrorText";

export function AccountCard() {
  return <MemberOnly>{() => <CardPanel />}</MemberOnly>;
}

function CardPanel() {
  const t = useTranslations("web.account.card");
  const format = useFormatter();
  const errorText = useErrorText();
  const [card, setCard] = useState<member.Card | null>(null);
  const [failed, setFailed] = useState<{ code: string | null; params: Record<string, string | number> } | null>(null);
  const [notice, setNotice] = useState("");
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void member.myCard().then((answer) => {
      if (!alive) return;
      if (answer.ok) setCard(answer.data);
      else setFailed({ code: answer.code, params: answer.params });
    });
    return () => {
      alive = false;
    };
  }, []);

  const replace = async () => {
    setAsking(false);
    setBusy(true);
    const answer = await member.replaceCard();
    setBusy(false);
    if (!answer.ok) return setNotice(errorText(answer.code, answer.params));
    setCard(answer.data);
    setNotice(t("replaced"));
  };

  const google = async () => {
    setBusy(true);
    const answer = await member.googleWallet();
    setBusy(false);
    if (!answer.ok) return setNotice(errorText(answer.code, answer.params));
    // Only Google's own "save to Wallet" address is followed.
    if (answer.data.url.startsWith("https://pay.google.com/")) window.location.assign(answer.data.url);
    else setNotice(errorText(null));
  };

  if (failed)
    return (
      <p className="status" data-kind="error" role="alert">
        {errorText(failed.code, failed.params)}
      </p>
    );
  if (!card)
    return (
      <p className="status" aria-live="polite">
        {t("loading")}
      </p>
    );

  return (
    <div className="account">
      <section className="account__card member-card" aria-labelledby="card-title">
        <div className="member-card__face">
          {/* eslint-disable-next-line @next/next/no-img-element -- an inline data image, nothing to optimise */}
          <img className="member-card__qr" src={member.qrImage(card.qr_svg)} alt={t("qrAlt", { number: card.number })} width={220} height={220} />
          <div>
            <h2 id="card-title" className="h3">
              {t("title")}
            </h2>
            <dl className="account__profile">
              <div>
                <dt>{t("number")}</dt>
                <dd className="member-card__number">{card.number}</dd>
              </div>
              <div>
                <dt>{t("issued")}</dt>
                <dd>{format.dateTime(new Date(card.issued_at), { timeZone: CLUB_TZ, day: "numeric", month: "long", year: "numeric" })}</dd>
              </div>
            </dl>
            <p className="league__text">{t("how")}</p>
          </div>
        </div>
      </section>

      <section className="account__card" aria-labelledby="wallet-title">
        <h2 id="wallet-title" className="h3">
          {t("walletTitle")}
        </h2>
        {card.apple_wallet || card.google_wallet ? (
          <p className="account__actions">
            {card.apple_wallet && (
              <a className="btn btn-secondary" href={member.APPLE_WALLET_URL}>
                {t("apple")}
              </a>
            )}
            {card.google_wallet && (
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void google()}>
                {t("google")}
              </button>
            )}
          </p>
        ) : (
          <p className="league__text">{t("walletLater")}</p>
        )}
        <p className="events__note">{t("walletNote")}</p>
      </section>

      <section className="account__card" aria-labelledby="lost-title">
        <h2 id="lost-title" className="h3">
          {t("lostTitle")}
        </h2>
        <p className="league__text">{t("lostText")}</p>
        {asking ? (
          <p className="account__confirm">
            <span>{t("lostAsk")}</span>
            <button type="button" className="btn btn-secondary" onClick={() => void replace()}>
              {t("lostYes")}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setAsking(false)}>
              {t("lostNo")}
            </button>
          </p>
        ) : (
          <p className="account__actions">
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setAsking(true)}>
              {t("lost")}
            </button>
          </p>
        )}
      </section>
      {notice && (
        <p className="status" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
