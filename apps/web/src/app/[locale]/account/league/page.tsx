import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountLeague } from "@/components/AccountLeague";
import { AccountNav } from "@/components/AccountNav";
import { AccountShell, accountMetadata } from "@/components/AccountShell";

// §9.3 `/cont/liga`: the league seen by the player alone (§6.15); private, never indexed (ADR-0011).
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.account.pages.league" });
  return accountMetadata(locale, t("title"));
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("web.account.pages.league");
  return (
    <AccountShell title={t("title")} lead={t("lead")}>
      <AccountNav current="/account/league" />
      <AccountLeague locale={locale} />
    </AccountShell>
  );
}
