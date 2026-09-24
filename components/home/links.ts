import type { AppPathname } from "@/i18n/routing";

export type StaticPathname = Exclude<AppPathname, `${string}[${string}`>;

const INTERNAL: StaticPathname[] = [
  "/",
  "/programe",
  "/facilitati",
  "/despre",
  "/preturi",
  "/rezervare",
  "/galerie",
  "/sfaturi",
  "/intrebari",
  "/contact",
  "/lista-asteptare",
  "/confidentialitate",
  "/termeni",
  "/cookies",
];

/** Scene links are edited in the admin; only known internal pages are turned into links. */
export function safeHref(href: string | null | undefined): StaticPathname | null {
  if (!href) return null;
  return (INTERNAL as string[]).includes(href) ? (href as StaticPathname) : null;
}
