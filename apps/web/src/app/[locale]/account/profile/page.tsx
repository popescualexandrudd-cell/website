import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountProfile } from "@/components/AccountProfile";
import { AccountNav } from "@/components/AccountNav";
import { AccountShell, accountMetadata } from "@/components/AccountShell";
import { siteFlags } from "@/lib/flags";

// §9.3 `/cont/profil`: details, password, children, privacy (§12.2); private, never indexed (ADR-0011).
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.account.pages.profile" });
  return accountMetadata(locale, t("title"));
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("web.account.pages.profile");
  const flags = await siteFlags();
  return (
    <AccountShell title={t("title")} lead={t("lead")}>
      <AccountNav current="/account/profile" />
      <AccountProfile childAccounts={flags.children} />
    </AccountShell>
  );
}
