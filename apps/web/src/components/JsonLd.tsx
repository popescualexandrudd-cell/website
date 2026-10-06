import { jsonLdText } from "@/lib/structured-data";

/** schema.org data for search engines (§15.1), rendered on the server. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(data) }} />;
}
