import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { ClientTexts } from "@/components/ClientTexts";
import { TokenAction } from "@/components/TokenAction";
import { TOKEN_NAMESPACES } from "@/lib/client-messages";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ConfirmPage({
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
        <ClientTexts namespaces={TOKEN_NAMESPACES}>
          <TokenAction mode="confirm" token={token} />
        </ClientTexts>
      </div>
    </section>
  );
}
