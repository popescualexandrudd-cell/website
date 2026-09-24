import "./home.css";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import {
  getCoach,
  getFacilities,
  getFaqs,
  getLocations,
  getPrograms,
  getScenes,
  getSettings,
  getTestimonials,
  localizedSettings,
  type SceneView,
} from "@/lib/content";
import { loadEngineInput } from "@/lib/availability-data";
import { freePlacesThisMonth } from "@/lib/availability";
import { formatMonth } from "@/lib/format";
import { Stage } from "@/components/scenes/Stage";
import { TravelingBall } from "@/components/scenes/TravelingBall";
import { SceneIndex } from "@/components/scenes/SceneIndex";
import { OpeningScene } from "@/components/scenes/OpeningScene";
import { SimpleScene } from "@/components/scenes/SimpleScene";
import { PhilosophyScene } from "@/components/scenes/PhilosophyScene";
import { MethodScene } from "@/components/scenes/MethodScene";
import { ProgramsScene } from "@/components/scenes/ProgramsScene";
import { CourtScene } from "@/components/scenes/CourtScene";
import { FirstLessonScene } from "@/components/scenes/FirstLessonScene";
import { PlacesScene } from "@/components/scenes/PlacesScene";
import { QuestionsScene } from "@/components/scenes/QuestionsScene";
import { ConstellationScene } from "@/components/scenes/ConstellationScene";
import { HomeDirector } from "@/components/motion/HomeDirector";
import { BookingWidget } from "@/components/booking/BookingWidget";
import { JsonLd } from "@/components/pages/JsonLd";
import { pageMetadata, localizedUrl } from "@/lib/seo";
import { businessLd, personLd } from "@/lib/structured-data";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const settings = localizedSettings(await getSettings(), locale as Locale);
  return pageMetadata({
    locale: locale as Locale,
    href: "/",
    title: settings.seoTitle,
    description: settings.seoDescription,
    absoluteTitle: true,
  });
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const [
    scenes,
    programs,
    locations,
    facilities,
    faqs,
    testimonials,
    settingsRow,
    engine,
    t,
    coach,
  ] = await Promise.all([
    getScenes(locale),
    getPrograms(locale),
    getLocations(locale),
    getFacilities(locale),
    getFaqs(locale, "home"),
    getTestimonials(locale, 3),
    getSettings(),
    loadEngineInput(),
    getTranslations("nav"),
    getCoach(locale),
  ]);
  const settings = localizedSettings(settingsRow, locale);
  const location = locations[0] ?? null;
  const amenities = facilities.filter((f) => f.type === "DOTARE_BAZA");
  const places = freePlacesThisMonth(engine);
  const month = formatMonth(engine.now, settings.timezone, locale);

  const render = (scene: SceneView, index: number) => {
    switch (scene.key) {
      case "deschiderea":
        return <OpeningScene key={scene.key} scene={scene} index={index} />;
      case "filozofia":
        return <PhilosophyScene key={scene.key} scene={scene} index={index} />;
      case "metoda":
        return <MethodScene key={scene.key} scene={scene} index={index} />;
      case "programe":
        return (
          <ProgramsScene
            key={scene.key}
            scene={scene}
            index={index}
            programs={programs}
            locale={locale}
          />
        );
      case "terenul":
        return (
          <CourtScene
            key={scene.key}
            scene={scene}
            index={index}
            location={location}
            amenities={amenities}
          />
        );
      case "prima-lectie":
        return (
          <FirstLessonScene
            key={scene.key}
            scene={scene}
            index={index}
            firstLessonText={settings.firstLessonText}
          />
        );
      case "locurile":
        return (
          <PlacesScene key={scene.key} scene={scene} index={index} month={month} count={places} />
        );
      case "intrebari":
        return (
          <QuestionsScene
            key={scene.key}
            scene={scene}
            index={index}
            faqs={faqs}
            testimonials={testimonials}
          />
        );
      case "constelatia":
        return (
          <ConstellationScene
            key={scene.key}
            scene={scene}
            index={index}
            settings={settings}
            location={location}
            widget={<BookingWidget programs={programs.filter((p) => p.bookableOnline)} />}
          />
        );
      default:
        return <SimpleScene key={scene.key} scene={scene} index={index} />;
    }
  };

  const directorConfig = scenes.map((scene) => ({
    key: scene.key,
    transition: scene.transition,
    tone: scene.tone === "DESCHIS" ? ("light" as const) : ("dark" as const),
    ball: scene.ball,
  }));

  return (
    <div className="home" data-home>
      <JsonLd
        data={[
          businessLd(settings, location, settings.seoDescription),
          personLd(settings, coach, localizedUrl("/despre", locale)),
        ]}
      />
      <Stage scenes={scenes} />
      <div className="scene-index-shell">
        <SceneIndex scenes={scenes} label={t("sceneIndexLabel")} />
      </div>
      <TravelingBall />
      {scenes.map(render)}
      <HomeDirector scenes={directorConfig} />
    </div>
  );
}
