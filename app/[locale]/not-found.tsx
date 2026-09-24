import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveArt } from "@/lib/art";
import { ArtPicture } from "@/components/ui/ArtPicture";

export default async function NotFound() {
  const t = await getTranslations();
  const art = resolveArt("09-curcubeu");
  return (
    <div className="grid-page error-page">
      <div className="error-copy">
        <p className="error-code numerals" aria-hidden="true">
          404
        </p>
        <h1 className="page-title">{t("errors.notFoundTitle")}</h1>
        <p className="page-intro">{t("errors.notFoundText")}</p>
        <p className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="btn btn-primary">
            {t("common.backHome")}
          </Link>
          <Link href="/rezervare" className="btn btn-secondary">
            {t("common.bookLesson")}
          </Link>
        </p>
      </div>
      {art ? (
        <figure className="error-figure">
          <ArtPicture art={art} alt="" desktopOnly sizes="(min-width: 1024px) 40vw, 100vw" />
        </figure>
      ) : null}
    </div>
  );
}
