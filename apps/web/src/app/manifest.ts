import type { MetadataRoute } from "next";
import { ColorNight900 } from "@jungle/design-tokens/tokens";
import { getTranslations } from "next-intl/server";
import { siteFlags } from "@/lib/flags";

/**
 * The installable site (§9.4, PWA): name, icons and colours of the app on the phone's home screen,
 * in Romanian (the club's language; the pages keep the visitor's own). On the full site, shortcuts to
 * booking, the account and the league; before the launch there is nothing to shortcut to.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations({ locale: "ro", namespace: "web.pwa" });
  const { mode } = await siteFlags();
  return {
    id: "/",
    name: "Jungle Padel",
    short_name: "Jungle Padel",
    description: t("description"),
    lang: "ro",
    start_url: "/ro",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: ColorNight900,
    theme_color: ColorNight900,
    categories: ["sports", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts:
      mode === "full"
        ? [
            { name: t("shortcuts.book"), url: "/ro/rezervari", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
            { name: t("shortcuts.account"), url: "/ro/cont", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
            { name: t("shortcuts.league"), url: "/ro/liga", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
          ]
        : [],
  };
}
