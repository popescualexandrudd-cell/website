import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { PageSection } from "@/components/pages/PageHero";
import { NewsletterConfirm } from "@/components/pages/NewsletterConfirm";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function NewsletterPage({
  params,
}: PageProps<"/[locale]/newsletter/[token]">) {
  const { locale: raw, token } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations("footer");
  const unsubscribe = token.startsWith("u.");
  const title = unsubscribe
    ? locale === "en"
      ? "Unsubscribe"
      : "Dezabonare"
    : t("newsletterTitle");
  const label = unsubscribe
    ? locale === "en"
      ? "Unsubscribe me"
      : "Dezabonează-mă"
    : locale === "en"
      ? "Confirm subscription"
      : "Confirmă abonarea";
  return (
    <PageSection className="page-section--narrow">
      <h1 className="page-title mt-12 mb-8">{title}</h1>
      <NewsletterConfirm token={decodeURIComponent(token)} label={label} />
    </PageSection>
  );
}
