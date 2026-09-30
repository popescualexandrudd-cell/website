import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayerPage } from "@/components/PlayerPage";
import { getPathname } from "@/i18n/navigation";
import { siteMode } from "@/lib/flags";
import { profile } from "@/lib/league-page";

// Per request (never a cached 404 from before the full site was turned on); data cached a minute.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; id: string }> };

// A player's public page (Q49, R-012), linked from the standings and the results. Unknown or
// retired players, and anything that is not a player id, are a 404.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "web.site.leaguePage" });
  const found = await profile(id);
  const title = found ? `${found.player.first_name} ${found.player.last_name}` : t("player.missing");
  // Public (Q49) but not offered to search engines: a person's name is found through the league
  // page, not through a search for it (privacy by default, §12).
  const canonical = getPathname({ href: { pathname: "/league/players/[id]", params: { id } }, locale: locale === "en" ? "en" : "ro" });
  return { title: `${title} · ${t("kicker")}`, robots: { index: false, follow: true }, alternates: { canonical } };
}

export default async function Page({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if ((await siteMode()) !== "full") notFound();
  const found = await profile(id);
  if (!found) notFound();
  return <PlayerPage profile={found} locale={locale} />;
}
