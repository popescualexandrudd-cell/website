import type { ReactNode } from "react";
import type { SceneView } from "@/lib/content";
import { ArtPicture } from "@/components/ui/ArtPicture";

type Props = {
  scene: SceneView;
  index: number;
  children: ReactNode;
  /** Pinned text (sticky) or text that flows over the fixed painting (long content). */
  layout?: "sticky" | "flow";
  /** Section length in viewport heights, in the cinematic layout. */
  length?: number;
  priority?: boolean;
  showStaticImage?: boolean;
  staticExtra?: ReactNode;
};

/**
 * One scene of the home page. The same markup serves three layouts, chosen by CSS alone:
 * cinematic (desktop, motion allowed: the painting lives in the shared stage), stacked (mobile:
 * the 9:16 painting, then the text) and static (reduced motion or no JS: painting, then text).
 */
export function SceneFrame({
  scene,
  index,
  children,
  layout = "sticky",
  length = 2,
  priority = false,
  showStaticImage = true,
  staticExtra,
}: Props) {
  const tone = scene.tone === "DESCHIS" ? "light" : "dark";
  return (
    <section
      id={scene.key}
      className={`scene scene--${layout}`}
      data-scene={scene.key}
      data-index={index}
      data-tone={tone}
      data-veil={scene.veil ? "true" : undefined}
      aria-labelledby={`${scene.key}-title`}
      style={{ ["--len" as string]: String(length) }}
    >
      {showStaticImage && scene.art ? (
        <figure className="scene-static" data-mpos={scene.textPosMobile}>
          <ArtPicture
            art={scene.art}
            alt={scene.imageAlt}
            priority={priority}
            className="scene-static-picture"
            imgClassName="scene-static-img"
          />
          {staticExtra}
        </figure>
      ) : null}
      <div className="scene-body">
        <div className="scene-text" data-pos={scene.textPosDesktop} data-mpos={scene.textPosMobile}>
          {children}
        </div>
      </div>
    </section>
  );
}
