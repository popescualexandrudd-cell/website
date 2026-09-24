import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import type { LocalizedSettings, LocationView, SceneView } from "@/lib/content";
import { mailLink, telLink, whatsappLink } from "@/lib/format";
import { TodoText } from "@/components/site/TodoText";
import { SectionHead } from "./SectionHead";

/** The last section: the booking widget, then the ways to reach the coach directly. */
export async function BookingSection({
  scene,
  settings,
  location,
  widget,
}: {
  scene: SceneView;
  settings: LocalizedSettings;
  location: LocationView | null;
  widget: ReactNode;
}) {
  const t = await getTranslations();
  const tel = telLink(settings.phone);
  const wa = whatsappLink(settings.whatsapp);
  const mail = mailLink(settings.email);
  return (
    <section className="booking tone-dark" id={scene.key} aria-labelledby={`${scene.key}-title`}>
      <div className="booking-inner">
        <div className="booking-copy">
          <SectionHead id={`${scene.key}-title`} kicker={scene.indexName} title={scene.title} />
          {scene.body ? (
            <p className="mt-4 text-cerneala-2">
              <TodoText value={scene.body} />
            </p>
          ) : null}
          <address className="booking-contact not-italic">
            <p className="footer-heading">{t("home.contactLabel")}</p>
            <ul>
              <li>
                {tel ? <a href={tel}>{settings.phone}</a> : <TodoText value={settings.phone} />}
              </li>
              {wa ? (
                <li>
                  <a href={wa} target="_blank" rel="noopener noreferrer">
                    {t("common.whatsapp")}
                  </a>
                </li>
              ) : null}
              <li>
                {mail ? <a href={mail}>{settings.email}</a> : <TodoText value={settings.email} />}
              </li>
              {location ? (
                <li>
                  <TodoText value={location.name} />
                  {", "}
                  <TodoText value={location.address} />
                </li>
              ) : null}
            </ul>
          </address>
        </div>
        <div className="booking-card">{widget}</div>
      </div>
    </section>
  );
}
