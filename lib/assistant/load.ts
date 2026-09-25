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
import { roCount } from "@/lib/format";
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
    giftCard: path("/card-cadou"),
    league: path("/liga-amatori"),
    partner: path("/partener-de-joc"),
    honours: path("/palmares"),
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
    ...(settings.giftCardsEnabled
      ? [
          {
            title: `${en ? "Gift cards" : "Carduri cadou"} (${paths.giftCard})`,
            body: en
              ? "A gift card holds one or more lessons of a chosen type, or an amount in lei. It is ordered on the gift card page and paid at the club or by bank transfer; the club then emails the card with a unique code, valid for 12 months. The person who receives it books on the site with the code (field “Gift card code”) or by phone. If that lesson is cancelled in time, the card becomes valid again."
              : "Un card cadou conține una sau mai multe lecții de un tip ales, sau o sumă în lei. Se comandă pe pagina cardului cadou și se plătește la club sau prin transfer; apoi clubul trimite cardul pe email, cu un cod unic, valabil 12 luni. Cine îl primește rezervă pe site cu codul (câmpul „Cod de card cadou”) sau la telefon. Dacă lecția se anulează la timp, cardul redevine valabil.",
          },
        ]
      : []),
    ...(settings.leagueEnabled
      ? [
          {
            title: `${en ? "Amateur league and hitting partners" : "Liga amatorilor și partenerii de joc"} (${paths.league}, ${paths.partner})`,
            body: en
              ? "Adults sign up on the league page or the partner page, with their level and when they play. The club checks every sign-up, splits league players into groups by level and publishes the table (first names and initials only). For a hitting partner, the club puts players in touch; contact details are never shown on the site."
              : "Adulții se înscriu pe pagina ligii sau pe cea de parteneri, cu nivelul și când joacă. Clubul verifică fiecare înscriere, împarte jucătorii ligii în grupe pe niveluri și publică clasamentul (doar prenumele și inițiala). Pentru partener de joc, clubul pune jucătorii în legătură; datele de contact nu apar pe site.",
          },
        ]
      : []),
    ...(settings.googleReviews
      ? [
          {
            title: en ? "Reviews" : "Recenzii",
            body: en
              ? `The club has ${settings.googleReviews.count} reviews on Google, average ${settings.googleReviews.rating} out of 5 (${settings.googleReviews.url}).`
              : `Clubul are ${roCount(settings.googleReviews.count, "o recenzie", "recenzii")} pe Google, cu nota medie ${String(settings.googleReviews.rating).replace(".", ",")} din 5 (${settings.googleReviews.url}).`,
          },
        ]
      : []),
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
