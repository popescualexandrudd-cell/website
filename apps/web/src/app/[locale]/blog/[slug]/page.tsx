import { setRequestLocale } from "next-intl/server";
import { BlogArticle, articleMetadata } from "@/components/Blog";
import { article } from "@/lib/blog";

// §9.3 `/blog/{address}`: one article. Anything that is not a published article's address is a 404.
export const revalidate = 300;

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  return articleMetadata(locale, await article(slug));
}

export default async function Page({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  return <BlogArticle item={await article(slug)} locale={locale} />;
}
