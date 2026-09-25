import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getHeadCoach, getSettings, getPageHeader, getPost } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { localizedUrl, pageMetadata } from "@/lib/seo";
import { articleLd, breadcrumbLd } from "@/lib/structured-data";
import { PageSection } from "@/components/pages/PageHero";
import { HeroBackdrop } from "@/components/pages/HeroBackdrop";
import { Breadcrumbs } from "@/components/pages/Breadcrumbs";
import { JsonLd } from "@/components/pages/JsonLd";
import { Markdown } from "@/components/site/Markdown";
import { Picture } from "@/components/ui/Picture";

type Props = PageProps<"/[locale]/sfaturi/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPost(slug, locale as Locale);
  if (!post) return {};
  return pageMetadata({
    locale: locale as Locale,
    href: { pathname: "/sfaturi/[slug]", params: { slug } },
    title: post.seoTitle,
    description: post.seoDescription,
    type: "article",
    publishedTime: post.publishedAt?.toISOString(),
    noindex: post.status !== "PUBLICAT",
  });
}

export default async function TipPage({ params }: Props) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const post = await getPost(slug, locale);
  if (!post) notFound();
  const [t, header, coach, settings] = await Promise.all([
    getTranslations(),
    getPageHeader("sfaturi", locale),
    getHeadCoach(locale),
    getSettings(),
  ]);
  const url = localizedUrl({ pathname: "/sfaturi/[slug]", params: { slug } }, locale);
  return (
    <article>
      <JsonLd
        data={[
          articleLd(post, url, coach?.name ?? settings.brandName),
          breadcrumbLd([
            { name: t("common.home"), url: localizedUrl("/", locale) },
            { name: header.title, url: localizedUrl("/sfaturi", locale) },
            { name: post.title, url },
          ]),
        ]}
      />
      <header className="page-hero tone-dark page-hero--media has-backdrop">
        <HeroBackdrop />
        <div className="page-hero-inner page-hero-inner--single">
          <div className="page-hero-copy">
            <Breadcrumbs
              label={t("nav.tips")}
              items={[
                { label: t("common.home"), href: "/" },
                { label: header.title, href: "/sfaturi" },
                { label: post.title },
              ]}
            />
            <h1 className="page-title">{post.title}</h1>
            {post.publishedAt ? (
              <p className="hero-meta mt-4">
                {t("tips.published", {
                  date: formatDate(post.publishedAt, "Europe/Bucharest", locale, "d MMMM yyyy"),
                })}
              </p>
            ) : null}
            <p className="page-intro">{post.excerpt}</p>
          </div>
        </div>
      </header>
      {post.cover ? (
        <PageSection>
          <Picture
            image={post.cover}
            alt={post.coverAlt}
            priority
            sizes="(min-width: 1024px) 70vw, 100vw"
          />
        </PageSection>
      ) : null}
      <PageSection className="page-section--narrow">
        <Markdown source={post.body} />
        <p className="mt-12 flex flex-wrap gap-3">
          <Link href="/rezervare" className="btn btn-primary">
            {t("common.bookLesson")}
          </Link>
          <Link href="/sfaturi" className="btn btn-secondary">
            {t("tips.back")}
          </Link>
        </p>
      </PageSection>
    </article>
  );
}
