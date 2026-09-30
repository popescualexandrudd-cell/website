import { setRequestLocale } from "next-intl/server";
import { AccountArea } from "@/components/AccountArea";
import { AccountNav } from "@/components/AccountNav";
import { AccountShell, accountMetadata } from "@/components/AccountShell";

// §9.3 `/cont`: signing in, then the visitor's own page (ADR-0011: the session cookie).
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return accountMetadata(locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <AccountShell>
      <AccountNav current="/account" />
      <AccountArea locale={locale} />
    </AccountShell>
  );
}
