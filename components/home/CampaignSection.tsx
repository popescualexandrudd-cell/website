import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { SceneView } from "@/lib/content";
import { renderInlineMarkdown } from "@/lib/markdown";
import { safeHref } from "./links";

/**
 * The welcome band right under the opening video: the club's current campaign in two short
 * lines (edited in the admin), with a button for each offer. The icons are decoration.
 */
export async function CampaignSection({ scene }: { scene: SceneView }) {
  const t = await getTranslations("campaign");
  const href = safeHref(scene.ctaHref) ?? "/inchiriere-teren";
  const lines = scene.body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const icons = ["❄️", "🎾"];
  return (
    <section className="campaign" id={scene.key} aria-labelledby={`${scene.key}-title`}>
      <div className="campaign-inner">
        <div className="campaign-copy">
          <p className="campaign-kicker">{t("label")}</p>
          <h2 id={`${scene.key}-title`} className="campaign-title">
            {scene.title}
          </h2>
          {lines.map((line, i) => (
            <p key={i} className="campaign-line">
              <span className="campaign-icon" aria-hidden="true">
                {icons[i % icons.length]}
              </span>
              {/* Markdown from the admin, rendered without HTML: bold only. */}
              <span dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(line) }} />
            </p>
          ))}
        </div>
        <div className="campaign-actions">
          {scene.ctaLabel ? (
            <Link href={href} className="btn btn-primary btn-arrow">
              {scene.ctaLabel}
            </Link>
          ) : null}
          {scene.extra.secondaryLabel ? (
            <Link href={{ pathname: "/programe", hash: "inscriere" }} className="btn btn-secondary">
              {scene.extra.secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
