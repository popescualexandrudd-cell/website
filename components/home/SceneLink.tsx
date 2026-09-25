import { Link } from "@/i18n/navigation";
import type { SceneView } from "@/lib/content";
import { safeHref } from "./links";

/** The section's button, when it has one (label and link come from the admin). */
export function SceneLink({
  scene,
  className = "btn btn-primary btn-arrow",
}: {
  scene: SceneView;
  className?: string;
}) {
  const href = safeHref(scene.ctaHref);
  if (!scene.ctaLabel || !href) return null;
  return (
    <Link href={href} className={className}>
      {scene.ctaLabel}
    </Link>
  );
}
