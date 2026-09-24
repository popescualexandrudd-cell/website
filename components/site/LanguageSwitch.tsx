"use client";

import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

type Props = { label: string; srLabel: string; className?: string };

/** Links to the same page in the other language (paths are translated, e.g. /preturi ↔ /en/pricing). */
export function LanguageSwitch({ label, srLabel, className }: Props) {
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const target = locale === "ro" ? "en" : "ro";
  const cleanParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key !== "locale" && typeof value === "string") cleanParams[key] = value;
  }
  const href = { pathname, params: cleanParams } as unknown as Parameters<typeof Link>[0]["href"];
  return (
    <Link href={href} locale={target} className={className} hrefLang={target} lang={target}>
      <span aria-hidden="true">{label}</span>
      <span className="sr-only">{srLabel}</span>
    </Link>
  );
}
