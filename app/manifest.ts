import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { isFilled, t } from "@/lib/i18n-content";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await db.siteSettings.findUniqueOrThrow({
    where: { id: 1 },
    select: { brandName: true, tagline: true, seoDescription: true },
  });
  const name = isFilled(settings.brandName) ? settings.brandName : t(settings.tagline, "ro");
  return {
    name,
    short_name: name.slice(0, 24),
    description: t(settings.seoDescription, "ro"),
    lang: "ro",
    start_url: "/",
    display: "browser",
    background_color: "#ECE3CF",
    theme_color: "#ECE3CF",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
  };
}
