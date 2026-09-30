import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingPicker } from "@/components/BookingPicker";
import { ClientTexts } from "@/components/ClientTexts";
import { getPathname } from "@/i18n/navigation";
import { BOOKING_NAMESPACES } from "@/lib/client-messages";
import { siteMode } from "@/lib/flags";

// §9.3 `/rezervari`: online booking of a padel court (full site only, Q57). The courts' free times
// are read live in the browser; the page itself is the same for everyone.
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.bookings" });
  const path = (to: "ro" | "en") => getPathname({ href: "/bookings", locale: to });
  return {
    title: `${t("title")} · Jungle Padel`,
    description: t("lead"),
    alternates: { canonical: path(locale === "en" ? "en" : "ro"), languages: { ro: path("ro"), en: path("en") } },
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if ((await siteMode()) !== "full") notFound();
  const t = await getTranslations("web.bookings");
  return (
    <ClientTexts namespaces={BOOKING_NAMESPACES}>
      <section className="page bookings-page" aria-labelledby="bookings-title">
        <div className="container">
          <h1 id="bookings-title" className="h2">
            {t("title")}
          </h1>
          <p className="lead">{t("lead")}</p>
          <BookingPicker locale={locale} />
        </div>
      </section>
    </ClientTexts>
  );
}
