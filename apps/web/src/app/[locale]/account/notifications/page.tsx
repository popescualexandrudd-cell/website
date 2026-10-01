import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountNotifications } from "@/components/AccountNotifications";
import { AccountNav } from "@/components/AccountNav";
import { AccountShell, accountMetadata } from "@/components/AccountShell";

// §9.3 `/cont/notificari`: push on this device and the kinds of messages (§11); private, never indexed (ADR-0011).
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.account.pages.notifications" });
  return accountMetadata(locale, t("title"));
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("web.account.pages.notifications");
  return (
    <AccountShell title={t("title")} lead={t("lead")}>
      <AccountNav current="/account/notifications" />
      <AccountNotifications />
    </AccountShell>
  );
}
