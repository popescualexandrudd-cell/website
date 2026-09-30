import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountMoney } from "@/components/AccountMoney";
import { AccountNav } from "@/components/AccountNav";
import { AccountShell, accountMetadata } from "@/components/AccountShell";

// §9.3 `/cont/plati`: credit, debts, subscriptions, vouchers (R-065); private, never indexed (ADR-0011).
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.account.pages.payments" });
  return accountMetadata(locale, t("title"));
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("web.account.pages.payments");
  return (
    <AccountShell title={t("title")} lead={t("lead")}>
      <AccountNav current="/account/payments" />
      <AccountMoney locale={locale} />
    </AccountShell>
  );
}
