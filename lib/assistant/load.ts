import "server-only";
import type { Locale } from "@/i18n/routing";
import {
  getAcademyGroups,
  getCoaches,
  getFacilities,
  getFaqs,
  getLessonTypes,
  getLocations,
  getPackages,
  getPosts,
  getPageHeader,
  getPrograms,
  getScenes,
  getSettings,
  getTournaments,
  localizedSettings,
} from "@/lib/content";
import { sitePath } from "@/lib/paths";
import { formatKnowledge, known, type KnowledgePaths } from "./knowledge";

/** Whether the assistant shows on the site: switched on in the admin and a key on the server. */
export function assistantAvailable(settings: { assistantEnabled: boolean }): boolean {
  return settings.assistantEnabled && Boolean(process.env.ANTHROPIC_API_KEY);
}

export function knowledgePaths(locale: Locale): KnowledgePaths {
  const path = (href: Parameters<typeof sitePath>[0]) => sitePath(href, locale);
  return {
    home: path("/"),
    programs: path("/programe"),
    academy: path("/academie"),
    evaluation: `${path("/academie")}#evaluare`,
    waitlist: path("/lista-asteptare"),
    team: path("/echipa"),
    pricing: path("/preturi"),
    booking: path("/rezervare"),
    facilities: path("/facilitati"),
    gallery: path("/galerie"),
    faq: path("/intrebari"),
    contact: path("/contact"),
    tips: path("/sfaturi"),
    privacy: path("/confidentialitate"),
    rental: path("/inchiriere-teren"),
    tournaments: path("/turnee"),
    schools: path("/scoli-gradinite"),
  };
}

/** The club's published content, read fresh for each question, as the assistant's knowledge. */
export async function loadClubKnowledge(locale: Locale) {
  const [
    row,
    locations,
    facilities,
    programs,
    lessons,
    packages,
    groups,
    coaches,
    faqs,
    posts,
    scenes,
    tournaments,
    rentalHeader,
    schoolsHeader,
  ] = await Promise.all([
    getSettings(),
    getLocations(locale),
    getFacilities(locale),
    getPrograms(locale),
    getLessonTypes(locale),
    getPackages(locale),
    getAcademyGroups(locale),
    getCoaches(locale),
    getFaqs(locale),
    getPosts(locale),
    getScenes(locale),
    getTournaments(locale),
    getPageHeader("inchiriere", locale),
    getPageHeader("scoli", locale),
  ]);
  const settings = localizedSettings(row, locale);
  const paths = knowledgePaths(locale);
  const en = locale === "en";
  const story = scenes.find((scene) => scene.key === "poveste");
  const pillars = scenes.find((scene) => scene.key === "piloni");
  const day = (date: Date) => date.toISOString().slice(0, 10);
  const tournamentLine = (x: (typeof tournaments.hosted)[number]) =>
    `- ${x.name} (${x.organizer === "FRT" ? (en ? "Romanian Tennis Federation" : "Federația Română de Tenis") : x.organizer === "TENIS10" ? "Tenis10" : x.organizer === "SPORTYA" ? "Sportya" : settings.brandName})${x.startsOn ? `, ${day(x.startsOn)}${x.endsOn ? ` – ${day(x.endsOn)}` : ""}` : ""}${x.category ? `, ${x.category}` : ""}${x.registrationUrl ? `, ${en ? "registration" : "înscriere"}: ${x.registrationUrl}` : ""}`;
  const sections = [
    {
      title: `${story?.indexName ?? (en ? "Our story" : "Povestea clubului")}${settings.foundedYear ? ` (${en ? "opened in" : "deschis în"} ${settings.foundedYear})` : ""}`,
      body: [story?.body, pillars?.body].filter(Boolean).join("\n"),
    },
    {
      title: `${rentalHeader.title} (${paths.rental})`,
      body: [
        rentalHeader.intro,
        en
          ? "A court is booked by phone or with the request form on the court hire page; the club calls back to confirm."
          : "Terenul se rezervă la telefon sau cu formularul de pe pagina de închiriere; clubul sună înapoi ca să confirme.",
        known(settings.rentalRates) ? `${en ? "Rates" : "Tarife"}: ${settings.rentalRates}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    },
    {
      title: `${en ? "Tournaments at the club" : "Turnee la club"} (${paths.tournaments})`,
      body: [
        tournaments.upcoming.length > 0
          ? `${en ? "Coming" : "Urmează"}:\n${tournaments.upcoming.map(tournamentLine).join("\n")}`
          : en
            ? "No upcoming edition has been announced on the site yet."
            : "Pe site nu e anunțată încă o ediție viitoare.",
        tournaments.hosted.length > 0
          ? `${en ? "Hosted" : "Găzduite"}:\n${tournaments.hosted.map(tournamentLine).join("\n")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    },
    { title: `${schoolsHeader.title} (${paths.schools})`, body: schoolsHeader.intro },
  ];
  const text = formatKnowledge({
    locale,
    settings: { ...settings, minNoticeHours: row.minNoticeHours, horizonDays: row.horizonDays },
    locations,
    facilities,
    programs: programs.map((p) => ({
      ...p,
      path: sitePath("/programe/[slug]", locale, { slug: p.slug }),
    })),
    lessons,
    packages,
    groups,
    coaches: coaches.map((c) => ({
      ...c,
      path: sitePath("/echipa/[slug]", locale, { slug: c.slug }),
    })),
    faqs,
    posts: posts
      .filter((p) => p.status === "PUBLICAT")
      .map((p) => ({
        title: p.title,
        excerpt: p.excerpt,
        path: sitePath("/sfaturi/[slug]", locale, { slug: p.slug }),
      })),
    sections,
    paths,
  });
  return { text, paths, settings: row };
}
