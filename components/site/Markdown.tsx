import { renderMarkdown } from "@/lib/markdown";

type Props = { source: string; className?: string };

/** Markdown from the admin; raw HTML is disabled in the renderer, so the output is safe. */
export function Markdown({ source, className = "prose-ed" }: Props) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }} />;
}
