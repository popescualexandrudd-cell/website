import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = { ro: `${SITE_URL}/ro`, en: `${SITE_URL}/en` };
  return (["ro", "en"] as const).map((locale) => ({
    url: `${SITE_URL}/${locale}`,
    changeFrequency: "weekly",
    priority: 1,
    alternates: { languages },
  }));
}
