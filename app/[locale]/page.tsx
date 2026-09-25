import "./home.css";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { formatRating } from "@/lib/reviews";
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
  getTournaments,
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
import { StorySection } from "@/components/home/StorySection";
import { PillarsSection } from "@/components/home/PillarsSection";
import { FinderSection } from "@/components/home/FinderSection";
import { TournamentsSection } from "@/components/home/TournamentsSection";
import { SocialSection } from "@/components/home/SocialSection";
import { assistantAvailable } from "@/lib/assistant/load";
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
    tournaments,
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
    getTournaments(locale),
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
  // Years since the club opened, counted from the settings (the current year in the club's zone).
  const thisYear = Number(
    new Intl.DateTimeFormat("en", { year: "numeric", timeZone: settings.timezone }).format(
      new Date(),
    ),
  );
  const years = settings.foundedYear ? thisYear - settings.foundedYear : 0;
  const figures: Figure[] = [
    ...(courtCount > 0
      ? [{ value: courtCount, label: t("figCourts", { count: courtCount }) }]
      : []),
    ...(coveredCount > 0
      ? [{ value: coveredCount, label: t("figCovered", { count: coveredCount }) }]
      : []),
    ...(years > 0 ? [{ value: years, label: t("figYears", { count: years }) }] : []),
    ...(settings.googleReviews
      ? [
          {
            value: settings.googleReviews.count,
            label: t("figReviews", {
              count: settings.googleReviews.count,
              rating: formatRating(settings.googleReviews.rating, locale),
            }),
          },
        ]
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
        return <MethodSection key={scene.key} scene={scene} />;
      case "poveste":
        return <StorySection key={scene.key} scene={scene} />;
      case "piloni":
        return <PillarsSection key={scene.key} scene={scene} />;
      case "potrivire":
        return (
          <FinderSection
            key={scene.key}
            scene={scene}
            programs={programs.map((p) => ({ slug: p.slug, name: p.name, summary: p.summary }))}
            groups={groups.map((g) => ({
              name: g.name,
              summary: g.summary,
              ageMin: g.ageMin,
              ageMax: g.ageMax,
              programSlug: g.program?.slug ?? null,
            }))}
            assistant={assistantAvailable(settingsRow)}
          />
        );
      case "turnee":
        return (
          <TournamentsSection
            key={scene.key}
            scene={scene}
            upcoming={tournaments.upcoming}
            hosted={tournaments.hosted}
            locale={locale}
          />
        );
      case "social":
        return <SocialSection key={scene.key} scene={scene} settings={settings} />;
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
          <QuestionsSection
            key={scene.key}
            scene={scene}
            faqs={faqs}
            testimonials={testimonials}
            reviews={settings.googleReviews}
          />
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
