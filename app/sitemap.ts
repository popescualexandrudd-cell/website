import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { localizedUrl } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type Href = Parameters<typeof localizedUrl>[0];

const STATIC: { href: Href; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] =
  [
    { href: "/", priority: 1, changeFrequency: "weekly" },
    { href: "/programe", priority: 0.9, changeFrequency: "monthly" },
    { href: "/preturi", priority: 0.9, changeFrequency: "monthly" },
    { href: "/rezervare", priority: 0.9, changeFrequency: "weekly" },
    { href: "/despre", priority: 0.8, changeFrequency: "monthly" },
    { href: "/facilitati", priority: 0.7, changeFrequency: "monthly" },
    { href: "/intrebari", priority: 0.7, changeFrequency: "monthly" },
    { href: "/contact", priority: 0.7, changeFrequency: "yearly" },
    { href: "/galerie", priority: 0.5, changeFrequency: "monthly" },
    { href: "/sfaturi", priority: 0.6, changeFrequency: "weekly" },
    { href: "/lista-asteptare", priority: 0.4, changeFrequency: "yearly" },
    { href: "/confidentialitate", priority: 0.2, changeFrequency: "yearly" },
    { href: "/termeni", priority: 0.2, changeFrequency: "yearly" },
    { href: "/cookies", priority: 0.2, changeFrequency: "yearly" },
  ];

/** Every public page, in Romanian and (when switched on) English, with hreflang alternates. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, programs, posts] = await Promise.all([
    db.siteSettings.findUniqueOrThrow({
      where: { id: 1 },
      select: { enEnabled: true, updatedAt: true },
    }),
    db.program.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
    db.post.findMany({
      where: { status: "PUBLICAT", publishedAt: { lte: new Date() } },
      select: { slug: true, updatedAt: true },
    }),
  ]);
  const locales: Locale[] = settings.enEnabled ? ["ro", "en"] : ["ro"];

  const entries: {
    href: Href;
    lastModified: Date;
    priority: number;
    changeFrequency: "weekly" | "monthly" | "yearly";
  }[] = [
    ...STATIC.map((s) => ({ ...s, lastModified: settings.updatedAt })),
    ...programs.map((p) => ({
      href: { pathname: "/programe/[slug]" as const, params: { slug: p.slug } },
      lastModified: p.updatedAt,
      priority: 0.8,
      changeFrequency: "monthly" as const,
    })),
    ...posts.map((p) => ({
      href: { pathname: "/sfaturi/[slug]" as const, params: { slug: p.slug } },
      lastModified: p.updatedAt,
      priority: 0.5,
      changeFrequency: "yearly" as const,
    })),
  ];

  return entries.flatMap((entry) =>
    locales.map((locale) => ({
      url: localizedUrl(entry.href, locale),
      lastModified: entry.lastModified,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
      alternates: settings.enEnabled
        ? { languages: { ro: localizedUrl(entry.href, "ro"), en: localizedUrl(entry.href, "en") } }
        : undefined,
    })),
  );
}
