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
  getPrograms,
  getSettings,
  localizedSettings,
} from "@/lib/content";
import { sitePath } from "@/lib/paths";
import { formatKnowledge, type KnowledgePaths } from "./knowledge";

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
  };
}

/** The club's published content, read fresh for each question, as the assistant's knowledge. */
export async function loadClubKnowledge(locale: Locale) {
  const [row, locations, facilities, programs, lessons, packages, groups, coaches, faqs, posts] =
    await Promise.all([
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
    ]);
  const settings = localizedSettings(row, locale);
  const paths = knowledgePaths(locale);
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
    paths,
  });
  return { text, paths, settings: row };
}
