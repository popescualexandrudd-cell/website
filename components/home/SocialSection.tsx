import type { LocalizedSettings, SceneView } from "@/lib/content";
import { TodoText } from "@/components/site/TodoText";
import { SectionHead } from "./SectionHead";

/** "@elite.tenis.club" from https://www.instagram.com/elite.tenis.club/ */
function handle(url: string): string {
  try {
    const part = new URL(url).pathname.split("/").filter(Boolean)[0];
    return part ? `@${part}` : url;
  } catch {
    return url;
  }
}

/**
 * The club's profiles as large cards. No embedded feed: nothing loads from Instagram or Facebook
 * until the visitor follows a link.
 */
export function SocialSection({
  scene,
  settings,
}: {
  scene: SceneView;
  settings: LocalizedSettings;
}) {
  const profiles = [
    { name: "Instagram", url: settings.instagramUrl },
    { name: "Facebook", url: settings.facebookUrl },
    { name: "TikTok", url: settings.tiktokUrl },
  ].filter((p): p is { name: string; url: string } => Boolean(p.url && /^https:\/\//.test(p.url)));
  if (profiles.length === 0) return null;
  return (
    <section className="social" id={scene.key} aria-labelledby={`${scene.key}-title`}>
      <div className="social-inner">
        <SectionHead id={`${scene.key}-title`} kicker={scene.indexName} title={scene.title}>
          {scene.body ? (
            <p className="section-lead">
              <TodoText value={scene.body} />
            </p>
          ) : null}
        </SectionHead>
        <ul className="social-grid">
          {profiles.map((p) => (
            <li key={p.name}>
              <a href={p.url} className="social-card" target="_blank" rel="noopener noreferrer me">
                <span className="social-network">{p.name}</span>
                <span className="social-handle">{handle(p.url)}</span>
                <span className="social-arrow" aria-hidden="true">
                  ↗
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
