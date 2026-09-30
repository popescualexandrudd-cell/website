import type { Metadata } from "next";
import Markdown from "react-markdown";
import { getFormatter, getTranslations } from "next-intl/server";
import type { components } from "@jungle/api-client";
import { api } from "@/lib/api";
import { siteFlags } from "@/lib/flags";

export type LegalKind = Exclude<components["schemas"]["DocumentKind"], "league_gdpr">;

/** Title keys in `web.legal` for each published document. */
const TITLE_KEY: Record<LegalKind, "terms" | "privacy" | "refunds" | "cookies" | "notice"> = {
  terms: "terms",
  privacy: "privacy",
  refunds: "refunds",
  cookies: "cookies",
  waitlist_notice: "notice",
};

export async function legalMetadata(locale: string, kind: LegalKind): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "web.legal" });
  return { title: `${t(TITLE_KEY[kind])} — Jungle Padel` };
}

/** The currently published version of a legal document (versioned in the backend, §12.3). */
export async function LegalDocument({ locale, kind }: { locale: string; kind: LegalKind }) {
  const t = await getTranslations("web.notice");
  const tLegal = await getTranslations("web.legal");
  const format = await getFormatter();
  const language = locale === "en" ? "en" : "ro";
  // A discreet entrance on the full site with the effects on (ADR-0023); the pre-launch site
  // shares these pages and keeps them exactly as they are.
  const effects = (await siteFlags()).effects;
  const { data } = await api
    .GET("/api/v1/legal/documents/{kind}", { params: { path: { kind }, query: { language } } })
    .catch(() => ({ data: undefined }));
  return (
    <section className="page">
      <div className="container">
        <article className="panel prose" data-reveal={effects ? "rise" : undefined}>
          <h1 className="h2" data-reveal={effects ? "lines" : undefined}>
            {data?.title ?? tLegal(TITLE_KEY[kind])}
          </h1>
          {data ? (
            <>
              <p className="muted">
                {t("version", { version: data.version, date: format.dateTime(new Date(data.published_at), { dateStyle: "long" }) })}
              </p>
              <Markdown>{data.body}</Markdown>
            </>
          ) : (
            <p className="status" data-kind="error">
              {t("unavailable")}
            </p>
          )}
        </article>
      </div>
    </section>
  );
}
