import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ClientTexts } from "./ClientTexts";
import { getPathname } from "@/i18n/navigation";
import { FULL_HOME_NAMESPACES } from "@/lib/client-messages";
import { siteMode } from "@/lib/flags";

/** The presentation pages of the full site (§9.3), built from the approved home sections. */
export type SitePageKey = "padel" | "tennis" | "pilates" | "packages" | "events" | "cafe" | "contact" | "blog" | "corporate" | "about";

const HREF = {
  padel: "/padel",
  tennis: "/tennis",
  pilates: "/pilates",
  packages: "/packages",
  events: "/events",
  cafe: "/cafe",
  contact: "/contact",
  blog: "/blog",
  corporate: "/corporate",
  about: "/about",
} as const;

/** The title, the description and the page's own address in both languages (indexed like the site). */
export async function sitePageMetadata(locale: string, page: SitePageKey): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "web.site" });
  const path = (to: "ro" | "en") => getPathname({ href: HREF[page], locale: to });
  return {
    title: `${t(`pages.${page}`)} · Jungle Padel`,
    description: t(`pageIntro.${page}`),
    alternates: { canonical: path(locale === "en" ? "en" : "ro"), languages: { ro: path("ro"), en: path("en") } },
  };
}

/**
 * A page of the full site: its title and a short introduction, then the sections. Only in full-site
 * mode (Q57); the simulators' texts travel with the page (`ClientTexts`).
 */
export async function SitePage({ page, children }: { page: SitePageKey; children: ReactNode }) {
  if ((await siteMode()) !== "full") notFound();
  const t = await getTranslations("web.site");
  return (
    <ClientTexts namespaces={FULL_HOME_NAMESPACES}>
      <section className="section page-intro" aria-labelledby="page-title">
        <div className="container">
          <p className="kicker" data-reveal="fade">
            Jungle Padel
          </p>
          <h1 id="page-title" className="h2" data-reveal="lines">
            {t(`pages.${page}`)}
          </h1>
          <p className="lead" data-reveal="rise">
            {t(`pageIntro.${page}`)}
          </p>
        </div>
      </section>
      {children}
    </ClientTexts>
  );
}
