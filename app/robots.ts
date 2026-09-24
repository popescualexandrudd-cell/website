import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/paths";

export const dynamic = "force-dynamic";

/** Personal pages (booking management, review and newsletter links) and the admin stay out of search engines. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/rezervare/",
        "/en/booking/",
        "/recenzie/",
        "/en/review/",
        "/newsletter/",
        "/en/newsletter/",
      ],
    },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
