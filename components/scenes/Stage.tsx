import type { SceneView } from "@/lib/content";
import { resolveArt } from "@/lib/art";
import { ArtPicture } from "@/components/ui/ArtPicture";

/** The stage only exists in the cinematic layout; its images never download elsewhere. */
export const CINEMATIC_MEDIA = "(min-width: 768px) and (prefers-reduced-motion: no-preference)";

/** Image-space size of the 16:9 paintings; SVG overlays use the same viewBox with "slice". */
export const IMAGE_W = 2560;
export const IMAGE_H = 1440;

function courtPaths(cx: number, cy: number, length: number): string[] {
  const width = (length * 10.97) / 23.77;
  const x0 = cx - width / 2;
  const y0 = cy - length / 2;
  const alley = (width * 1.37) / 10.97;
  const service = (length * 6.4) / 23.77;
  return [
    `M ${x0} ${y0} H ${x0 + width} V ${y0 + length} H ${x0} Z`,
    `M ${x0 + alley} ${y0} V ${y0 + length}`,
    `M ${x0 + width - alley} ${y0} V ${y0 + length}`,
    `M ${x0 + alley} ${cy - service} H ${x0 + width - alley}`,
    `M ${x0 + alley} ${cy + service} H ${x0 + width - alley}`,
    `M ${cx} ${cy - service} V ${cy + service}`,
    `M ${x0 - width * 0.05} ${cy} H ${x0 + width * 1.05}`,
  ];
}

const CONSTELLATION: [number, number][] = [
  [0.1, 0.62],
  [0.2, 0.4],
  [0.31, 0.28],
  [0.42, 0.26],
  [0.52, 0.31],
  [0.6, 0.44],
];

const BRUSH_STROKES = [
  "M -120 1180 C 420 1010, 900 1280, 1420 1060 S 2380 900, 2720 1120",
  "M -160 760 C 380 560, 980 840, 1480 620 S 2300 460, 2760 700",
  "M -140 320 C 520 120, 1080 420, 1580 200 S 2320 60, 2760 260",
];

/**
 * The shared, sticky stage behind the scene texts (cinematic layout only). Every painting is a
 * layer; the choreography (components/motion/cinematic.ts) cross-fades, zooms and masks them.
 * It is decorative: aria-hidden, since each scene's own section carries its text and image alt.
 */
export function Stage({ scenes }: { scenes: SceneView[] }) {
  const clouds = ["nor-01", "nor-02", "nor-03", "nor-04", "nor-05"].map((key) => ({ key, art: resolveArt(key) }));
  const texture = resolveArt("textura-pergament");
  const courtScene = scenes.find((s) => s.key === "terenul");
  const court = courtPaths(IMAGE_W / 2, IMAGE_H / 2, IMAGE_H * 0.8);
  const brushTargets = scenes
    .map((scene, i) => ({ scene, previous: scenes[i - 1] }))
    .filter(({ previous }) => previous?.transition === "MASCA_PENSULA");

  return (
    <div className="stage" aria-hidden="true">
      <div className="stage-parchment">{texture ? <ArtPicture art={texture} alt="" desktopOnly gateMedia={CINEMATIC_MEDIA} className="stage-fill" imgClassName="stage-img" /> : null}</div>
      {scenes.map((scene, i) => (
        <div key={scene.key} className="stage-group" data-group={scene.key}>
          {scene.art ? (
            <div
              className="stage-layer"
              data-layer={scene.key}
              data-role="primary"
              data-aspect={(scene.art.desktop.width / scene.art.desktop.height).toFixed(4)}
              data-first={i === 0 ? "true" : undefined}
            >
              <ArtPicture art={scene.art} alt="" desktopOnly gateMedia={CINEMATIC_MEDIA} priority={i === 0} className="stage-fill" imgClassName="stage-img" />
            </div>
          ) : null}
          {scene.artSecondary ? (
            <div
              className="stage-layer"
              data-layer={scene.key}
              data-role="secondary"
              data-aspect={(scene.artSecondary.desktop.width / scene.artSecondary.desktop.height).toFixed(4)}
            >
              <ArtPicture art={scene.artSecondary} alt="" desktopOnly gateMedia={CINEMATIC_MEDIA} className="stage-fill" imgClassName="stage-img" />
            </div>
          ) : null}
        </div>
      ))}

      {brushTargets.map(({ scene }) => {
        const art = scene.art?.desktop;
        const href = art?.webp.find((v) => v.w >= 1920)?.src ?? art?.fallback;
        if (!href) return null;
        return (
          <svg key={scene.key} className="stage-brush" data-brush-for={scene.key} viewBox={`0 0 ${IMAGE_W} ${IMAGE_H}`} preserveAspectRatio="xMidYMid slice">
            <defs>
              <mask id={`brush-${scene.key}`} maskUnits="userSpaceOnUse" x="0" y="0" width={IMAGE_W} height={IMAGE_H}>
                <rect width={IMAGE_W} height={IMAGE_H} fill="black" />
                {BRUSH_STROKES.map((d, i) => (
                  <path key={i} d={d} className="brush-stroke" stroke="white" strokeWidth={560} strokeLinecap="round" fill="none" pathLength={1} />
                ))}
              </mask>
            </defs>
            <image data-href={href} width={IMAGE_W} height={IMAGE_H} preserveAspectRatio="xMidYMid slice" mask={`url(#brush-${scene.key})`} />
          </svg>
        );
      })}

      {courtScene ? (
        <svg className="stage-court" viewBox={`0 0 ${IMAGE_W} ${IMAGE_H}`} preserveAspectRatio="xMidYMid slice">
          {court.map((d, i) => (
            <path key={i} d={d} className="court-line" pathLength={1} />
          ))}
        </svg>
      ) : null}

      <svg className="stage-rainbow" viewBox={`0 0 ${IMAGE_W} ${IMAGE_H}`} preserveAspectRatio="xMidYMid slice">
        {["#C65B4E", "#D99A4E", "#E3CB6B", "#86A96A", "#5D86B8", "#6E5E9E"].map((color, i) => {
          const r = IMAGE_W * 0.4 - i * 36;
          return (
            <path
              key={color}
              d={`M ${IMAGE_W / 2 - r} ${IMAGE_H * 1.02} A ${r} ${r} 0 0 1 ${IMAGE_W / 2 + r} ${IMAGE_H * 1.02}`}
              stroke={color}
              strokeWidth={36}
              fill="none"
              pathLength={1}
              className="rainbow-band"
            />
          );
        })}
      </svg>

      <svg className="stage-constellation" viewBox={`0 0 ${IMAGE_W} ${IMAGE_H}`} preserveAspectRatio="xMidYMid slice">
        <path
          d={`M ${CONSTELLATION.map(([x, y]) => `${x * IMAGE_W} ${y * IMAGE_H}`).join(" L ")}`}
          className="constellation-line"
          pathLength={1}
        />
        {CONSTELLATION.map(([x, y], i) => (
          <circle key={i} cx={x * IMAGE_W} cy={y * IMAGE_H} r={7} className="constellation-star" />
        ))}
      </svg>

      <div className="stage-clouds">
        {clouds.map(({ key, art }) =>
          art ? (
            <ArtPicture key={key} art={art} alt="" desktopOnly gateMedia={CINEMATIC_MEDIA} sizes="40vw" className="stage-cloud" priority style={{ backgroundImage: "none" }} />
          ) : null,
        )}
      </div>

      <canvas className="stage-halftone" />
      <div className="stage-halftone-fallback" />
      <div className="stage-night" />
      <div className="stage-flash" />
    </div>
  );
}
