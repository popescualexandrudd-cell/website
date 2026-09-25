import { loadClubKnowledge } from "@/lib/assistant/load";
import { appUrl } from "@/lib/paths";

export const dynamic = "force-dynamic";

/**
 * /llms.txt: the club in plain text for AI search engines (ChatGPT, Perplexity, Google's AI
 * answers), built from the same published content as the site's assistant, with full links.
 */
export async function GET() {
  const { text, settings } = await loadClubKnowledge("ro");
  const base = appUrl();
  const absolute = text
    .replace(/\((\/[^)\s]*)\)/g, (_, path: string) => `(${base}${path})`)
    .replace(/: (\/[\w#?=&/-]*)$/gm, (_, path: string) => `: ${base}${path}`);
  const body = absolute.replace(
    /^# .*$/m,
    (title) => `${title}\n\n> ${settings.brandName}: ${base}`,
  );
  return new Response(`${body}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
