import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { TokenAction } from "@/components/TokenAction";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  setRequestLocale((await params).locale);
  const raw = (await searchParams).token;
  const token = typeof raw === "string" && raw.length <= 500 ? raw : null;
  return (
    <section className="page">
      <div className="container">
        <TokenAction mode="unsubscribe" token={token} />
      </div>
    </section>
  );
}
