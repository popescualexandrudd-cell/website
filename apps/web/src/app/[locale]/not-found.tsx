import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("web.confirm");
  return (
    <section className="page">
      <div className="container">
        <div className="panel">
          <h1 className="h2">404</h1>
          <Link href="/">{t("back")}</Link>
        </div>
      </div>
    </section>
  );
}
