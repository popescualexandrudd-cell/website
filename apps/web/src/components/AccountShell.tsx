import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ClientTexts } from "./ClientTexts";
import { ACCOUNT_NAMESPACES } from "@/lib/client-messages";
import { siteMode } from "@/lib/flags";

/** The account's pages are private: never offered to search engines. */
export async function accountMetadata(locale: string, title?: string): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "web.account" });
  return { title: `${title ?? t("title")} · Jungle Padel`, robots: { index: false, follow: false } };
}

/** The frame of the account's pages (full site only, Q57), with the texts of their forms. */
export async function AccountShell({ title, lead, children }: { title?: string; lead?: string; children: ReactNode }) {
  if ((await siteMode()) !== "full") notFound();
  const t = await getTranslations("web.account");
  return (
    <ClientTexts namespaces={ACCOUNT_NAMESPACES}>
      <section className="page account-page" aria-labelledby={title === undefined ? "account-title" : undefined}>
        <div className="container">
          {title !== "" && (
            <>
              <h1 id="account-title" className="h2">
                {title ?? t("title")}
              </h1>
              <p className="lead">{lead ?? t("lead")}</p>
            </>
          )}
          {children}
        </div>
      </section>
    </ClientTexts>
  );
}
