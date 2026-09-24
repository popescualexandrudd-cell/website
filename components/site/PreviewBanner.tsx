import { getTranslations } from "next-intl/server";
import { isPreview } from "@/lib/content";

export async function PreviewBanner() {
  if (!(await isPreview())) return null;
  const t = await getTranslations("common");
  return (
    <div className="preview-banner" role="status">
      <span>{t("preview")}</span>
      {/* A route handler that clears the preview cookie: it needs a full request, not client navigation. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/api/preview/disable" className="underline">
        {t("exitPreview")}
      </a>
    </div>
  );
}
