import type { AppPathname } from "@/i18n/routing";

export type StaticPathname = Exclude<AppPathname, `${string}[${string}`>;

const INTERNAL: StaticPathname[] = [
  "/",
  "/programe",
  "/facilitati",
  "/despre",
  "/academie",
  "/echipa",
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
  "/inchiriere-teren",
  "/turnee",
  "/scoli-gradinite",
];

export type SafeHref = StaticPathname | { pathname: StaticPathname; hash: string };

/**
 * Scene links are edited in the admin; only known internal pages (optionally with an anchor,
 * "/academie#evaluare") are turned into links.
 */
export function safeHref(href: string | null | undefined): SafeHref | null {
  if (!href) return null;
  const [path = "", hash] = href.split("#", 2);
  if (!(INTERNAL as string[]).includes(path)) return null;
  const pathname = path as StaticPathname;
  return hash && /^[a-z0-9-]{1,40}$/.test(hash) ? { pathname, hash } : pathname;
}
