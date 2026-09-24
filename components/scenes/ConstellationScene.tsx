import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import type { LocalizedSettings, LocationView, SceneView } from "@/lib/content";
import { mailLink, telLink, whatsappLink } from "@/lib/format";
import { TodoText } from "@/components/site/TodoText";
import { SceneFrame } from "./SceneFrame";
import { SceneTitle } from "./SceneTitle";

/** Scene 10 · constellation: the booking widget sits inside the scene, then direct contact. */
export async function ConstellationScene({
  scene,
  index,
  settings,
  location,
  widget,
}: {
  scene: SceneView;
  index: number;
  settings: LocalizedSettings;
  location: LocationView | null;
  widget: ReactNode;
}) {
  const t = await getTranslations();
  const tel = telLink(settings.phone);
  const wa = whatsappLink(settings.whatsapp);
  const mail = mailLink(settings.email);
  return (
    <SceneFrame scene={scene} index={index} layout="flow">
      <SceneTitle id={`${scene.key}-title`} text={scene.title} className="scene-title--stars">
        <span data-split="words">
          <TodoText value={scene.title} />
        </span>
      </SceneTitle>
      {scene.body ? (
        <p className="scene-lead">
          <TodoText value={scene.body} />
        </p>
      ) : null}
      <div className="constellation-widget">{widget}</div>
      <address className="constellation-contact not-italic">
        <p className="sr-only">{t("home.contactLabel")}</p>
        <ul>
          <li>{tel ? <a href={tel}>{settings.phone}</a> : <TodoText value={settings.phone} />}</li>
          {wa ? (
            <li>
              <a href={wa} target="_blank" rel="noopener noreferrer">
                {t("common.whatsapp")}
              </a>
            </li>
          ) : null}
          <li>{mail ? <a href={mail}>{settings.email}</a> : <TodoText value={settings.email} />}</li>
          {location ? (
            <li>
              <TodoText value={location.address} />
            </li>
          ) : null}
        </ul>
      </address>
    </SceneFrame>
  );
}
