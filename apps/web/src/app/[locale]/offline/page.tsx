import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReloadButton } from "@/components/ReloadButton";

// §9.4: the page the service worker (public/sw.js) shows when a page cannot be reached without a
// connection. Built once, stored on the phone at install; on both the pre-launch and the full site.
export const dynamic = "force-static";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.pwa.offline" });
  return { title: `${t("title")} · Jungle Padel`, robots: { index: false, follow: false } };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("web.pwa.offline");
  return (
    <section className="page" aria-labelledby="offline-title">
      <div className="container">
        <div className="panel">
          <h1 id="offline-title" className="h2">
            {t("title")}
          </h1>
          <p className="lead">{t("text")}</p>
          <p className="account__actions">
            <ReloadButton label={t("retry")} />
          </p>
        </div>
      </div>
    </section>
  );
}
