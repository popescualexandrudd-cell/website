import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getPageHeader, getPosts } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { PageHero, PageSection } from "@/components/pages/PageHero";
import { ArtPicture } from "@/components/ui/ArtPicture";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/sfaturi">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const header = await getPageHeader("sfaturi", locale);
  return pageMetadata({
    locale,
    href: "/sfaturi",
    title: header.seoTitle,
    description: header.seoDescription,
  });
}

export default async function TipsPage({ params }: PageProps<"/[locale]/sfaturi">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [header, posts, t] = await Promise.all([
    getPageHeader("sfaturi", locale),
    getPosts(locale),
    getTranslations("tips"),
  ]);
  return (
    <>
      <PageHero
        title={header.title}
        intro={header.intro}
        art={header.art}
        imageAlt={header.imageAlt}
      />
      <PageSection className="page-section--narrow">
        {posts.length === 0 ? (
          <p className="notice">{t("empty")}</p>
        ) : (
          <ul>
            {posts.map((post) => (
              <li key={post.id} className={`ed-row ${post.cover ? "" : "ed-row--no-image"}`}>
                {post.cover ? (
                  <span className="ed-row-image">
                    <ArtPicture art={post.cover} alt="" sizes="9rem" />
                  </span>
                ) : null}
                <div>
                  <h2 className="ed-row-title">
                    <Link href={{ pathname: "/sfaturi/[slug]", params: { slug: post.slug } }}>
                      {post.title}
                    </Link>
                  </h2>
                  {post.publishedAt ? (
                    <p className="ed-row-meta">
                      {t("published", {
                        date: formatDate(
                          post.publishedAt,
                          "Europe/Bucharest",
                          locale,
                          "d MMMM yyyy",
                        ),
                      })}
                    </p>
                  ) : null}
                  <p className="ed-row-text">{post.excerpt}</p>
                </div>
                <span />
              </li>
            ))}
          </ul>
        )}
      </PageSection>
    </>
  );
}
