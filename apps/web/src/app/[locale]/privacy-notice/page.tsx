import type { Metadata } from "next";
import Markdown from "react-markdown";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic"; // always the currently published version

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.notice" });
  return { title: `${t("title")} — Jungle Padel` };
}

export default async function NoticePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("web.notice");
  const format = await getFormatter();
  const language = locale === "en" ? "en" : "ro";
  const { data } = await api
    .GET("/api/v1/legal/documents/{kind}", { params: { path: { kind: "waitlist_notice" }, query: { language } } })
    .catch(() => ({ data: undefined }));
  return (
    <section className="page">
      <div className="container">
        <article className="panel prose">
          <h1 className="section-title">{data?.title ?? t("title")}</h1>
          {data ? (
            <>
              <p className="lead">
                {t("version", { version: data.version, date: format.dateTime(new Date(data.published_at), { dateStyle: "long" }) })}
              </p>
              <Markdown>{data.body}</Markdown>
            </>
          ) : (
            <p className="status" data-kind="error">{t("unavailable")}</p>
          )}
        </article>
      </div>
    </section>
  );
}
