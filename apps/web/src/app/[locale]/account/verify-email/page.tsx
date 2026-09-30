import { setRequestLocale } from "next-intl/server";
import { VerifyEmail } from "@/components/AccountForms";
import { AccountShell, accountMetadata } from "@/components/AccountShell";

// The link from the confirmation email (`?token=`), read per request.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return accountMetadata(locale);
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const token = one((await searchParams).token);
  return (
    <AccountShell title="">
      <VerifyEmail token={token && token.length <= 500 ? token : null} />
    </AccountShell>
  );
}
