import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { renderInlineMarkdown } from "@/lib/markdown";

/**
 * The winter court price as the headline offer, placed above the ways to book: the price, why,
 * and a button to the court request form.
 */
export async function WinterOffer({ onRentalPage = false }: { onRentalPage?: boolean }) {
  const t = await getTranslations("rental");
  return (
    <aside className="offer-panel winter-offer" aria-labelledby="oferta-iarna-title">
      <p className="kicker">{t("campaignKicker")}</p>
      <h2 id="oferta-iarna-title" className="offer-title">
        {t("campaignTitle")}
      </h2>
      <p className="offer-price">
        <span className="offer-price-value numerals">{t("campaignPrice")}</span>
        <span className="offer-price-per">{t("campaignPer")}</span>
      </p>
      <p className="offer-text">{t("campaignText")}</p>
      <ul className="offer-points">
        {(["campaignPoint1", "campaignPoint2"] as const).map((key) => (
          <li key={key} dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(t(key)) }} />
        ))}
      </ul>
      {onRentalPage ? (
        <a href="#cerere" className="btn btn-primary btn-arrow">
          {t("campaignCta")}
        </a>
      ) : (
        <Link
          href={{ pathname: "/inchiriere-teren", hash: "cerere" }}
          className="btn btn-primary btn-arrow"
        >
          {t("campaignCta")}
        </Link>
      )}
    </aside>
  );
}
