import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { siteMode } from "@/lib/flags";

/** A useful 404 (§15.1): what happened and the way on; the full site's pages only when it is on. */
export default async function NotFound() {
  const t = await getTranslations("web.problem");
  const full = (await siteMode()) === "full";
  return (
    <section className="page" aria-labelledby="problem-title">
      <div className="container">
        <div className="panel">
          <p className="kicker">404</p>
          <h1 id="problem-title" className="h2">
            {t("notFoundTitle")}
          </h1>
          <p>{t("notFoundText")}</p>
          <ul className="problem__links">
            <li>
              <Link href="/">{t("home")}</Link>
            </li>
            {full ? (
              <>
                <li>
                  <Link href="/bookings">{t("bookings")}</Link>
                </li>
                <li>
                  <Link href="/league">{t("league")}</Link>
                </li>
                <li>
                  <Link href="/contact">{t("contact")}</Link>
                </li>
              </>
            ) : null}
          </ul>
        </div>
      </div>
    </section>
  );
}
