import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LeaguePage } from "@/components/LeaguePage";
import { getPathname } from "@/i18n/navigation";
import { siteMode } from "@/lib/flags";
import { filtersFrom } from "@/lib/league-page";

// Per request: the choices live in the address, and the page must not be pre-rendered while the
// full site is still off at build time (it would stay a 404). The API data is cached for a minute.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

// §9.3 `/liga`: the standings, results and tournaments of the league (full site only, Q57).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.site.leaguePage" });
  // Indexed like the rest of the site (SITE_INDEXABLE, in the layout), with its own address.
  const path = (to: "ro" | "en") => getPathname({ href: "/league", locale: to });
  return {
    title: `${t("title")} · Jungle Padel`,
    description: t("lead"),
    alternates: { canonical: path(locale === "en" ? "en" : "ro"), languages: { ro: path("ro"), en: path("en") } },
  };
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  if ((await siteMode()) !== "full") notFound();
  return <LeaguePage filters={filtersFrom(await searchParams)} />;
}
