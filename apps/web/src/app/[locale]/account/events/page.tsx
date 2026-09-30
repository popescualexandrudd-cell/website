import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountEvents } from "@/components/AccountEvents";
import { AccountNav } from "@/components/AccountNav";
import { AccountShell, accountMetadata } from "@/components/AccountShell";

// §9.3 `/cont/evenimente`: the event room request (R-110, Q34); private, never indexed (ADR-0011).
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.account.pages.events" });
  return accountMetadata(locale, t("title"));
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("web.account.pages.events");
  return (
    <AccountShell title={t("title")} lead={t("lead")}>
      <AccountNav current="/account/events" />
      <AccountEvents />
    </AccountShell>
  );
}
