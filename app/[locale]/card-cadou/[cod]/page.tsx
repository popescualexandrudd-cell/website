import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getSettings, localizedSettings } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { urls } from "@/lib/paths";
import { describeGiftCard, giftCardState } from "@/lib/gift-cards";
import { lessonNameOf, loadGiftCard } from "@/lib/gift-cards-server";
import { BrandMark } from "@/components/site/BrandMark";
import { PrintButton } from "@/components/ui/PrintButton";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/**
 * The gift card itself, to print or to send on: who it is for, what it is worth, the code and a
 * QR code that opens the booking with the code filled in. Reachable only with the code.
 */
export default async function GiftCardView({ params }: PageProps<"/[locale]/card-cadou/[cod]">) {
  const { locale: raw, cod } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const card = await loadGiftCard(decodeURIComponent(cod));
  if (!card?.code || card.status === "CERERE" || card.status === "ANULATA") notFound();
  const [row, t] = await Promise.all([getSettings(), getTranslations("gift")]);
  const settings = localizedSettings(row, locale);
  const state = giftCardState(card);
  const bookingUrl = `${urls.booking(locale)}?cod=${encodeURIComponent(card.code)}`;
  const qr = await QRCode.toString(bookingUrl, { type: "svg", margin: 0 });
  const value = describeGiftCard(
    {
      lessonName: lessonNameOf(card, locale),
      lessons: card.lessons,
      durationMin: card.durationMin,
      amountRon: card.amountRon,
    },
    locale,
  );

  return (
    <section className="gift-view page-section">
      <div className="gift-view-actions no-print">
        <PrintButton label={t("print")} />
        {state === "usable" ? (
          <Link
            href={{ pathname: "/rezervare", query: { cod: card.code } }}
            className="btn btn-secondary"
          >
            {t("bookWithCard")}
          </Link>
        ) : null}
      </div>
      {state !== "usable" ? (
        <p className="gift-view-state" role="status">
          {t(`state.${state}`)}
        </p>
      ) : null}
      <article className="gift-card-print" aria-label={t("cardKicker")}>
        <header className="gift-card-print-head">
          <BrandMark logo={settings.logo} monogram={settings.monogram} />
          <div>
            <p className="gift-card-print-brand">{settings.brandName}</p>
            <p className="gift-card-kicker">{t("cardKicker")}</p>
          </div>
        </header>
        <p className="gift-card-print-for">{t("for", { name: card.recipientName })}</p>
        <p className="gift-card-value">{value}</p>
        {card.message ? <p className="gift-card-print-message">„{card.message}”</p> : null}
        <div className="gift-card-print-foot">
          <div>
            <p className="gift-card-print-label">{t("codeLabel")}</p>
            <p className="gift-card-code numerals">{card.code}</p>
            {card.expiresAt ? (
              <p className="gift-card-print-label">
                {t("validUntil", {
                  date: formatDate(card.expiresAt, "UTC", locale, "d MMMM yyyy"),
                })}
              </p>
            ) : null}
            <p className="gift-card-print-how">{t("howToUse", { phone: settings.phone })}</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- a generated QR code (data URL) */}
          <img
            className="gift-card-qr"
            src={`data:image/svg+xml;base64,${Buffer.from(qr).toString("base64")}`}
            alt={t("qrAlt")}
            width={120}
            height={120}
          />
        </div>
      </article>
    </section>
  );
}
