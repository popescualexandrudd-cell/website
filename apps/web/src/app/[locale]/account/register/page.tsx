import { getTranslations, setRequestLocale } from "next-intl/server";
import { type LegalVersion, RegisterForm } from "@/components/AccountForms";
import { AccountShell, accountMetadata } from "@/components/AccountShell";
import { SERVER_API_URL } from "@/lib/site";

// The documents' current versions change rarely; the form reads them again every 5 minutes.
export const revalidate = 300;

async function currentVersions(language: "ro" | "en"): Promise<LegalVersion[] | null> {
  try {
    const docs = await Promise.all(
      (["terms", "privacy"] as const).map(async (kind) => {
        const response = await fetch(`${SERVER_API_URL}/api/v1/legal/documents/${kind}?language=${language}`, { next: { revalidate: 300 } });
        if (!response.ok) return null;
        const body = (await response.json()) as { version?: unknown; language?: unknown };
        return Number.isInteger(body.version) ? { kind, version: body.version as number, language: body.language === "en" ? "en" : ("ro" as const) } : null;
      }),
    );
    return docs.every((d) => d !== null) ? (docs as LegalVersion[]) : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.account.register" });
  return accountMetadata(locale, t("title"));
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const language = locale === "en" ? "en" : "ro";
  const t = await getTranslations("web.account.register");
  return (
    <AccountShell title={t("title")} lead={t("lead")}>
      <RegisterForm locale={language} documents={await currentVersions(language)} />
    </AccountShell>
  );
}
