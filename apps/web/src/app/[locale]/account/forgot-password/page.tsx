import { setRequestLocale } from "next-intl/server";
import { ForgotPassword } from "@/components/AccountForms";
import { AccountShell, accountMetadata } from "@/components/AccountShell";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return accountMetadata(locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <AccountShell title="">
      <ForgotPassword />
    </AccountShell>
  );
}
