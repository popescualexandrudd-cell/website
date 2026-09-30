import { setRequestLocale } from "next-intl/server";
import { NewPassword } from "@/components/AccountForms";
import { AccountShell, accountMetadata } from "@/components/AccountShell";

// The link from the password email (`?uid=&token=`), read per request.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => {
  const value = (Array.isArray(v) ? v[0] : v) ?? null;
  return value && value.length <= 200 ? value : null;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return accountMetadata(locale);
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  return (
    <AccountShell title="">
      <NewPassword uid={one(query.uid)} token={one(query.token)} />
    </AccountShell>
  );
}
