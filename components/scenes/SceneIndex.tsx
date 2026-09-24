import type { SceneView } from "@/lib/content";

/**
 * Left-column index of the scenes, with a thin progress line. Plain anchor links, so it works
 * without JavaScript; the director marks the current scene with aria-current.
 */
export function SceneIndex({ scenes, label }: { scenes: SceneView[]; label: string }) {
  return (
    <nav className="scene-index" aria-label={label}>
      <span className="scene-index-track" aria-hidden="true">
        <span className="scene-index-progress" />
      </span>
      <ol>
        {scenes.map((scene) => (
          <li key={scene.key}>
            <a href={`#${scene.key}`} data-index-link={scene.key}>
              {scene.indexName}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
