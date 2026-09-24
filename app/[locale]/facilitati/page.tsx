import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getFacilities, getLocations, getPageHeader } from "@/lib/content";
import { TODO_MARK } from "@/lib/i18n-content";
import { pageMetadata } from "@/lib/seo";
import { PageHero, PageSection } from "@/components/pages/PageHero";
import { MapOnClick } from "@/components/pages/MapOnClick";
import { TodoText } from "@/components/site/TodoText";
import { Markdown } from "@/components/site/Markdown";
import { ArtPicture } from "@/components/ui/ArtPicture";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/facilitati">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const header = await getPageHeader("facilitati", locale);
  return pageMetadata({
    locale,
    href: "/facilitati",
    title: header.seoTitle,
    description: header.seoDescription,
  });
}

export default async function FacilitiesPage({ params }: PageProps<"/[locale]/facilitati">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [header, locations, facilities, t] = await Promise.all([
    getPageHeader("facilitati", locale),
    getLocations(locale),
    getFacilities(locale),
    getTranslations(),
  ]);
  const yesNo = (value: boolean | null) =>
    value === null ? TODO_MARK : value ? t("common.yes") : t("common.no");
  const amenities = facilities.filter((f) => f.type === "DOTARE_BAZA");
  const services = facilities.filter((f) => f.type !== "DOTARE_BAZA");

  return (
    <>
      <PageHero
        title={header.title}
        intro={header.intro}
        art={header.art}
        imageAlt={header.imageAlt}
      />
      {locations.map((location) => (
        <PageSection key={location.id} id={`locatie-${location.id}`} title={t("facilities.courts")}>
          <p className="section-subtitle">
            <TodoText value={location.name} />
          </p>
          <p className="text-cerneala-2">
            <TodoText value={location.address} />
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="price-table">
              <thead>
                <tr>
                  <th scope="col">{t("facilities.courts")}</th>
                  <th scope="col">{t("facilities.count")}</th>
                  <th scope="col">{t("facilities.floodlights")}</th>
                  <th scope="col">{t("facilities.winter")}</th>
                </tr>
              </thead>
              <tbody>
                {location.courts.map((court) => (
                  <tr key={court.id}>
                    <th scope="row" className="zgura font-normal">
                      {court.name}{" "}
                      <span className="text-note">
                        ({t(`facilities.surface.${court.surface}`)})
                      </span>
                    </th>
                    <td>
                      <TodoText value={court.count === null ? TODO_MARK : String(court.count)} />
                    </td>
                    <td>
                      <TodoText value={yesNo(court.floodlights)} />
                    </td>
                    <td>
                      <TodoText value={yesNo(court.coveredInWinter)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="section-subtitle">{t("facilities.map")}</h3>
              {location.lat !== null && location.lng !== null ? (
                <>
                  <MapOnClick
                    lat={location.lat}
                    lng={location.lng}
                    title={t("facilities.mapTitle", { name: location.name })}
                    buttonLabel={t("facilities.showMap")}
                    notice={t("facilities.mapNotice")}
                  />
                  {location.mapUrl ? (
                    <p className="mt-3">
                      <a
                        href={location.mapUrl}
                        className="link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t("facilities.openInMaps")}
                      </a>
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="notice">
                  <TodoText value={TODO_MARK} />
                </p>
              )}
            </div>
            {location.directions ? (
              <div>
                <h3 className="section-subtitle">{t("facilities.directions")}</h3>
                <Markdown source={location.directions} />
              </div>
            ) : null}
          </div>
        </PageSection>
      ))}

      {amenities.length > 0 ? (
        <PageSection id="dotari" title={t("facilities.amenities")}>
          <ul className="amenity-list">
            {amenities.map((a) => (
              <li key={a.id}>
                <TodoText value={a.name} />
                {a.description ? (
                  <span className="text-cerneala-2">
                    {" "}
                    · <TodoText value={a.description} />
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}

      {services.length > 0 ? (
        <PageSection id="servicii" title={t("facilities.services")}>
          <ul>
            {services.map((service) => (
              <li key={service.id} className={`ed-row ${service.image ? "" : "ed-row--no-image"}`}>
                {service.image ? (
                  <span className="ed-row-image">
                    <ArtPicture art={service.image} alt={service.imageAlt} sizes="9rem" />
                  </span>
                ) : null}
                <div>
                  <h3 className="ed-row-title">
                    <TodoText value={service.name} />
                  </h3>
                  {service.description ? (
                    <p className="ed-row-text">
                      <TodoText value={service.description} />
                    </p>
                  ) : null}
                </div>
                <span className="ed-row-aside text-cerneala-2">
                  {service.type === "ECHIPAMENT" ? t("facilities.equipment") : ""}
                </span>
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}
    </>
  );
}
