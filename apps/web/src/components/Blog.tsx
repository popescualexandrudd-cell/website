import { getFormatter, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import { getPathname, Link } from "@/i18n/navigation";
import { type Article, type ArticleSummary, inLanguage, readingMinutes } from "@/lib/blog";
import { siteMode } from "@/lib/flags";
import { SITE_URL } from "@/lib/site";

/** `/blog`: the published articles, newest first (§9.3, §15.2). Rendered on the server. */
export async function BlogList({ items, locale }: { items: ArticleSummary[] | null; locale: string }) {
  const t = await getTranslations("web.blog");
  const format = await getFormatter();
  if (items === null)
    return (
      <p className="status" data-kind="error">
        {t("unavailable")}
      </p>
    );
  if (items.length === 0) return <p className="league__text">{t("empty")}</p>;
  return (
    <ul className="blog-list">
      {items.map((item, index) => {
        const { title, summary } = inLanguage(item, locale);
        return (
          <li key={item.slug} className="blog-card" data-reveal="rise" style={{ "--i": index } as React.CSSProperties}>
            <p className="blog-card__meta">
              <time dateTime={item.published_at}>{format.dateTime(new Date(item.published_at), { dateStyle: "long" })}</time>
              {item.demo && <span className="events__flag">{t("demo")}</span>}
            </p>
            <h2 className="h3">
              <Link href={{ pathname: "/blog/[slug]", params: { slug: item.slug } }}>{title}</Link>
            </h2>
            <p>{summary}</p>
          </li>
        );
      })}
    </ul>
  );
}

/** An article's own address in both languages (the address is the same, the language changes). */
export function articlePaths(slug: string) {
  const path = (locale: "ro" | "en") => getPathname({ href: { pathname: "/blog/[slug]", params: { slug } }, locale });
  return { ro: path("ro"), en: path("en") };
}

export async function articleMetadata(locale: string, item: Article | null): Promise<Metadata> {
  if (!item) return {};
  const { title, summary } = inLanguage(item, locale);
  const paths = articlePaths(item.slug);
  return {
    title: `${title} · Jungle Padel`,
    description: summary,
    alternates: { canonical: locale === "en" ? paths.en : paths.ro, languages: paths },
    openGraph: { type: "article", title, description: summary, publishedTime: item.published_at, modifiedTime: item.updated_at },
  };
}

/**
 * One article (§9.3 `/blog/{address}`). The text is Markdown written in the panel: headings, lists,
 * links and emphasis; no images and no HTML (the renderer draws neither). Links to other sites open
 * with `rel="noopener"`; the structured data (JSON-LD) helps search engines (§15.2).
 */
export async function BlogArticle({ item, locale }: { item: Article | null; locale: string }) {
  if ((await siteMode()) !== "full" || !item) notFound();
  const t = await getTranslations("web.blog");
  const format = await getFormatter();
  const { title, summary, body } = inLanguage(item, locale);
  const paths = articlePaths(item.slug);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description: summary,
    datePublished: item.published_at,
    dateModified: item.updated_at,
    inLanguage: locale,
    mainEntityOfPage: `${SITE_URL}${locale === "en" ? paths.en : paths.ro}`,
    publisher: { "@type": "Organization", name: "Jungle Padel" },
  };
  return (
    <article className="section page-intro blog-article" aria-labelledby="page-title">
      <div className="container blog-article__container">
        <p className="kicker">
          <Link href="/blog">{t("back")}</Link>
        </p>
        <h1 id="page-title" className="h2">
          {title}
        </h1>
        <p className="blog-card__meta">
          <time dateTime={item.published_at}>{format.dateTime(new Date(item.published_at), { dateStyle: "long" })}</time>
          <span>{t("reading", { minutes: readingMinutes(body) })}</span>
          {item.demo && <span className="events__flag">{t("demo")}</span>}
        </p>
        <p className="lead">{summary}</p>
        <div className="prose blog-article__body">
          <Markdown
            skipHtml
            disallowedElements={["img"]}
            components={{
              a: ({ href, children }) =>
                href && /^https?:\/\//.test(href) ? (
                  <a href={href} rel="noopener noreferrer nofollow" target="_blank">
                    {children}
                  </a>
                ) : (
                  <a href={href}>{children}</a>
                ),
            }}
          >
            {body}
          </Markdown>
        </div>
        {/* Structured data from our own texts only (JSON of strings; "<" escaped). */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      </div>
    </article>
  );
}
