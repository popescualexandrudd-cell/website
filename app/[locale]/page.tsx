import "./home.css";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import {
  getAcademyGroups,
  getCoaches,
  getFacilities,
  getFaqs,
  getGallery,
  getLessonTypes,
  getLocations,
  getPageHeader,
  getPrograms,
  getScenes,
  getSettings,
  getTestimonials,
  localizedSettings,
  type SceneView,
} from "@/lib/content";
import { HeroSection } from "@/components/home/HeroSection";
import { StatementSection } from "@/components/home/StatementSection";
import { FiguresSection, type Figure } from "@/components/home/FiguresSection";
import { ProgramsSection } from "@/components/home/ProgramsSection";
import { AcademySection } from "@/components/home/AcademySection";
import { TeamSection } from "@/components/home/TeamSection";
import { MethodSection } from "@/components/home/MethodSection";
import { VenueSection } from "@/components/home/VenueSection";
import { GallerySection } from "@/components/home/GallerySection";
import { LessonsSection } from "@/components/home/LessonsSection";
import { QuestionsSection } from "@/components/home/QuestionsSection";
import { BookingSection } from "@/components/home/BookingSection";
import { TextSection } from "@/components/home/TextSection";
import { BookingWidget } from "@/components/booking/BookingWidget";
import { JsonLd } from "@/components/pages/JsonLd";
import { pageMetadata, localizedUrl } from "@/lib/seo";
import { businessLd, faqLd, personLd } from "@/lib/structured-data";

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
    lessons,
    groups,
    coaches,
    locations,
    facilities,
    faqs,
    testimonials,
    gallery,
    venueHeader,
    settingsRow,
    t,
  ] = await Promise.all([
    getScenes(locale),
    getPrograms(locale),
    getLessonTypes(locale),
    getAcademyGroups(locale),
    getCoaches(locale),
    getLocations(locale),
    getFacilities(locale),
    getFaqs(locale, "home"),
    getTestimonials(locale, 3),
    getGallery(locale, 6),
    getPageHeader("facilitati", locale),
    getSettings(),
    getTranslations("home"),
  ]);
  const settings = localizedSettings(settingsRow, locale);
  const location = locations[0] ?? null;
  const amenities = facilities.filter((f) => f.type === "DOTARE_BAZA");

  // The numbers of the club, counted from the content.
  const courts = location?.courts ?? [];
  const courtCount = courts.reduce((sum, c) => sum + (c.count ?? 0), 0);
  const coveredCount = courts.reduce((sum, c) => sum + (c.coveredInWinter ? (c.count ?? 0) : 0), 0);
  const ages = [...groups.map((g) => g.ageMin), ...programs.map((p) => p.ageMin)].filter(
    (age): age is number => age !== null,
  );
  const figures: Figure[] = [
    ...(courtCount > 0
      ? [{ value: courtCount, label: t("figCourts", { count: courtCount }) }]
      : []),
    ...(coveredCount > 0
      ? [{ value: coveredCount, label: t("figCovered", { count: coveredCount }) }]
      : []),
    ...(ages.length > 0 ? [{ value: Math.min(...ages), suffix: "+", label: t("figAge") }] : []),
    ...(programs.length > 0
      ? [{ value: programs.length, label: t("figPrograms", { count: programs.length }) }]
      : []),
    ...(coaches.length > 1
      ? [{ value: coaches.length, label: t("figCoaches", { count: coaches.length }) }]
      : []),
  ].slice(0, 4);

  const coachUrls = coaches.map((coach) => ({
    coach,
    url: localizedUrl({ pathname: "/echipa/[slug]", params: { slug: coach.slug } }, locale),
  }));

  const render = (scene: SceneView) => {
    switch (scene.key) {
      case "deschiderea":
        return <HeroSection key={scene.key} scene={scene} settings={settings} />;
      case "manifest":
        return <StatementSection key={scene.key} scene={scene} />;
      case "cifre":
        return <FiguresSection key={scene.key} scene={scene} figures={figures} />;
      case "programe":
        return <ProgramsSection key={scene.key} scene={scene} programs={programs} />;
      case "academia":
        return <AcademySection key={scene.key} scene={scene} groups={groups} />;
      case "echipa":
        return <TeamSection key={scene.key} scene={scene} coaches={coaches} />;
      case "metoda":
        return <MethodSection key={scene.key} scene={scene} labEnabled={settings.labEnabled} />;
      case "clubul":
        return (
          <VenueSection
            key={scene.key}
            scene={scene}
            location={location}
            amenities={amenities}
            image={venueHeader.image}
            imageAlt={venueHeader.imageAlt}
          />
        );
      case "galerie":
        return <GallerySection key={scene.key} scene={scene} items={gallery} />;
      case "lectii":
        return <LessonsSection key={scene.key} scene={scene} lessons={lessons} />;
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
          businessLd(settings, location, settings.seoDescription, {
            lessons,
            groups,
            coachUrls: coachUrls.map((c) => c.url),
          }),
          ...coachUrls.map((c) => personLd(settings, c.coach, c.url)),
          ...(faqs.length > 0 ? [faqLd(faqs)] : []),
        ]}
      />
      {scenes.map(render)}
    </div>
  );
}
