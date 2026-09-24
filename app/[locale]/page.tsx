import "./home.css";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
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
import { HeroSection } from "@/components/home/HeroSection";
import { CoachSection } from "@/components/home/CoachSection";
import { StatementSection } from "@/components/home/StatementSection";
import { MethodSection } from "@/components/home/MethodSection";
import { PathwaySection } from "@/components/home/PathwaySection";
import { ProgramsSection } from "@/components/home/ProgramsSection";
import { VenueSection } from "@/components/home/VenueSection";
import { FirstLessonSection } from "@/components/home/FirstLessonSection";
import { PlacesSection } from "@/components/home/PlacesSection";
import { QuestionsSection } from "@/components/home/QuestionsSection";
import { BookingSection } from "@/components/home/BookingSection";
import { TextSection } from "@/components/home/TextSection";
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

  const [scenes, programs, locations, facilities, faqs, testimonials, settingsRow, engine, coach] =
    await Promise.all([
      getScenes(locale),
      getPrograms(locale),
      getLocations(locale),
      getFacilities(locale),
      getFaqs(locale, "home"),
      getTestimonials(locale, 3),
      getSettings(),
      loadEngineInput(),
      getCoach(locale),
    ]);
  const settings = localizedSettings(settingsRow, locale);
  const location = locations[0] ?? null;
  const amenities = facilities.filter((f) => f.type === "DOTARE_BAZA");
  const places = freePlacesThisMonth(engine);
  const month = formatMonth(engine.now, settings.timezone, locale);

  const render = (scene: SceneView) => {
    switch (scene.key) {
      case "deschiderea":
        return <HeroSection key={scene.key} scene={scene} />;
      case "antrenorul":
        return <CoachSection key={scene.key} scene={scene} coach={coach} />;
      case "filozofia":
        return <StatementSection key={scene.key} scene={scene} />;
      case "metoda":
        return <MethodSection key={scene.key} scene={scene} />;
      case "palierele":
        return <PathwaySection key={scene.key} scene={scene} />;
      case "programe":
        return (
          <ProgramsSection key={scene.key} scene={scene} programs={programs} locale={locale} />
        );
      case "terenul":
        return (
          <VenueSection key={scene.key} scene={scene} location={location} amenities={amenities} />
        );
      case "prima-lectie":
        return (
          <FirstLessonSection
            key={scene.key}
            scene={scene}
            firstLessonText={settings.firstLessonText}
          />
        );
      case "locurile":
        return <PlacesSection key={scene.key} scene={scene} month={month} count={places} />;
      case "intrebari":
        return (
          <QuestionsSection key={scene.key} scene={scene} faqs={faqs} testimonials={testimonials} />
        );
      case "rezervare":
        return (
          <BookingSection
            key={scene.key}
            scene={scene}
            settings={settings}
            location={location}
            widget={<BookingWidget programs={programs.filter((p) => p.bookableOnline)} />}
          />
        );
      default:
        return <TextSection key={scene.key} scene={scene} />;
    }
  };

  return (
    <div className="home" data-home>
      <JsonLd
        data={[
          businessLd(settings, location, settings.seoDescription),
          personLd(settings, coach, localizedUrl("/despre", locale)),
        ]}
      />
      {scenes.map(render)}
    </div>
  );
}
