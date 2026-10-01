import { setRequestLocale } from "next-intl/server";
import { BlogList } from "@/components/Blog";
import { SitePage, sitePageMetadata } from "@/components/SitePage";
import { articles } from "@/lib/blog";

// §9.3 `/blog`, §15.2: the club's articles, written in the panel (Q57: only when the site is on).
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return sitePageMetadata(locale, "blog");
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <SitePage page="blog">
      <section className="section" aria-label="Blog">
        <div className="container">
          <BlogList items={await articles()} locale={locale} />
        </div>
      </section>
    </SitePage>
  );
}
