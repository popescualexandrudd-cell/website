import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getGallery, getPageHeader } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { PageHero, PageSection } from "@/components/pages/PageHero";
import { GalleryBrowser } from "@/components/pages/GalleryBrowser";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/galerie">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const header = await getPageHeader("galerie", locale);
  return pageMetadata({
    locale,
    href: "/galerie",
    title: header.seoTitle,
    description: header.seoDescription,
  });
}

export default async function GalleryPage({ params }: PageProps<"/[locale]/galerie">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [header, items, t] = await Promise.all([
    getPageHeader("galerie", locale),
    getGallery(locale),
    getTranslations("gallery"),
  ]);
  const categories = [...new Set(items.map((i) => i.category))];
  return (
    <>
      <PageHero
        title={header.title}
        intro={header.intro}
        art={header.art}
        imageAlt={header.imageAlt}
      />
      <PageSection>
        {items.length > 0 ? (
          <GalleryBrowser items={items} categories={categories} />
        ) : (
          <p className="notice measure">{t("empty")}</p>
        )}
      </PageSection>
    </>
  );
}
