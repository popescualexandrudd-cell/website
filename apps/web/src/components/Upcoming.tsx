import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { siteMode } from "@/lib/flags";

export type UpcomingPage = "padel" | "league" | "tennis" | "pilates" | "packages" | "events" | "cafe" | "contact" | "bookings" | "account";

/** A page of the full site still being built (Stage 11): only in full-site mode, never indexed. */
export async function upcomingMetadata(locale: string, page: UpcomingPage): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "web.site" });
  return { title: `${t(`pages.${page}`)} · Jungle Padel`, robots: { index: false, follow: false } };
}

export async function Upcoming({ page }: { page: UpcomingPage }) {
  if ((await siteMode()) !== "full") notFound();
  const t = await getTranslations("web.site");
  return (
    <section className="page upcoming" aria-labelledby="upcoming-title">
      <div className="container">
        <div className="panel">
          <p className="kicker">{t("upcoming.kicker")}</p>
          <h1 id="upcoming-title" className="h2">
            {t(`pages.${page}`)}
          </h1>
          <p className="lead">{t("upcoming.text")}</p>
          <Link href="/" className="btn btn-secondary">
            {t("upcoming.home")}
          </Link>
        </div>
      </div>
    </section>
  );
}
