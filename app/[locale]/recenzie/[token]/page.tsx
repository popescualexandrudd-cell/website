import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { PageSection } from "@/components/pages/PageHero";
import { ReviewForm } from "@/components/pages/ReviewForm";

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function ReviewPage({ params }: PageProps<"/[locale]/recenzie/[token]">) {
  const { locale: raw, token } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations("review");
  const booking = token.length >= 20 ? await db.booking.findUnique({ where: { reviewTokenHash: hashToken(token) }, select: { id: true } }) : null;
  const already = booking ? await db.testimonial.findFirst({ where: { bookingId: booking.id }, select: { id: true } }) : null;
  return (
    <PageSection className="page-section--narrow">
      <h1 className="page-title mt-12">{t("title")}</h1>
      {!booking ? (
        <p className="page-intro">{t("invalid")}</p>
      ) : already ? (
        <p className="page-intro">{t("already")}</p>
      ) : (
        <>
          <p className="page-intro mb-8">{t("intro")}</p>
          <ReviewForm token={token} />
        </>
      )}
    </PageSection>
  );
}
