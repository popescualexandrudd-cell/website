import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export const ACCOUNT_PAGES = ["/account", "/account/card", "/account/payments", "/account/league", "/account/events", "/account/profile"] as const;
export type AccountPage = (typeof ACCOUNT_PAGES)[number];

const KEYS: Record<AccountPage, string> = {
  "/account": "overview",
  "/account/card": "card",
  "/account/payments": "payments",
  "/account/league": "league",
  "/account/events": "events",
  "/account/profile": "profile",
};

/** The account's own menu (rendered on the server; the pages themselves check the session). */
export async function AccountNav({ current }: { current: AccountPage }) {
  const t = await getTranslations("web.account.nav");
  return (
    <nav className="account-nav" aria-label={t("label")}>
      <ul>
        {ACCOUNT_PAGES.map((page) => (
          <li key={page}>
            <Link href={page} aria-current={page === current ? "page" : undefined}>
              {t(KEYS[page])}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
