import type { MetadataRoute } from "next";
import { INDEXABLE, SITE_URL } from "@/lib/site";

// Search engines only in production (SITE_INDEXABLE=true); staging and previews stay hidden.
export default function robots(): MetadataRoute.Robots {
  return INDEXABLE
    ? { rules: { userAgent: "*", allow: "/" }, sitemap: `${SITE_URL}/sitemap.xml` }
    : { rules: { userAgent: "*", disallow: "/" } };
}
