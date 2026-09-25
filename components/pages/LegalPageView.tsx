import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import type { LegalKind } from "@/lib/generated/prisma/client";
import { getLegalPage, getSettings, localizedSettings } from "@/lib/content";
import { fillLegalTemplate } from "@/lib/legal";
import { assistantUsesModel } from "@/lib/assistant/load";
import { campaignConfig } from "@/lib/campaigns";
import { formatDate } from "@/lib/format";
import { PageSection } from "./PageHero";
import { Markdown } from "@/components/site/Markdown";

export async function LegalPageView({ kind, locale }: { kind: LegalKind; locale: Locale }) {
  const [page, settingsRow, t] = await Promise.all([
    getLegalPage(kind, locale),
    getSettings(),
    getTranslations("legal"),
  ]);
  if (!page) notFound();
  const settings = localizedSettings(settingsRow, locale);
  const campaigns = campaignConfig();
  const body = fillLegalTemplate(
    page.body,
    settings,
    page.version,
    locale,
    settingsRow.retentionMonths,
    {
      assistant: assistantUsesModel(settingsRow),
      analytics: Boolean(campaigns.gaId),
      googleAds: Boolean(campaigns.adsId),
      metaPixel: Boolean(campaigns.metaPixelId),
    },
  );
  return (
    <>
      <header className="grid-page page-hero-text">
        <div className="page-hero-copy">
          <h1 className="page-title">{page.title}</h1>
          <p className="ed-row-meta mt-3">
            {t("version", { version: page.version })} ·{" "}
            {t("updated", {
              date: formatDate(page.updatedAt, settings.timezone, locale, "d MMMM yyyy"),
            })}
          </p>
        </div>
      </header>
      <PageSection className="page-section--narrow">
        <Markdown source={body} className="prose-ed legal-prose" />
      </PageSection>
    </>
  );
}
