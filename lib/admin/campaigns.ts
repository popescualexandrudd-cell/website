import { attributionSchema } from "@/lib/attribution";

export type SourceKind = "booking" | "evaluation" | "waitlist" | "message";

export type SourceRow = {
  key: string;
  source: string;
  medium: string;
  campaign: string | null;
  counts: Record<SourceKind, number>;
  total: number;
};

const DIRECT = { source: "direct sau necunoscut", medium: "—" };

/**
 * Groups bookings, assessment requests, waiting-list entries and messages by where the visitor
 * came from (source / medium / campaign), most results first.
 */
export function summarizeSources(items: { kind: SourceKind; attribution: unknown }[]): SourceRow[] {
  const rows = new Map<string, SourceRow>();
  for (const item of items) {
    const parsed = attributionSchema.safeParse(item.attribution);
    const a = parsed.success ? parsed.data : null;
    const source = a?.source ?? DIRECT.source;
    const medium = a?.medium ?? DIRECT.medium;
    const campaign = a?.campaign || null;
    const key = `${source}\u0000${medium}\u0000${campaign ?? ""}`;
    let row = rows.get(key);
    if (!row) {
      row = {
        key,
        source,
        medium,
        campaign,
        counts: { booking: 0, evaluation: 0, waitlist: 0, message: 0 },
        total: 0,
      };
      rows.set(key, row);
    }
    row.counts[item.kind] += 1;
    row.total += 1;
  }
  return [...rows.values()].sort((a, b) => b.total - a.total || a.source.localeCompare(b.source));
}

/** A link with UTM tags, so the visits (and bookings) from a campaign show up under its name. */
export function campaignUrl(
  base: string,
  tags: { source: string; medium: string; campaign: string; content?: string },
): string | null {
  const clean = (value: string | undefined) =>
    (value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return null;
  }
  const source = clean(tags.source);
  const medium = clean(tags.medium);
  const campaign = clean(tags.campaign);
  if (!source || !medium || !campaign) return null;
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", medium);
  url.searchParams.set("utm_campaign", campaign);
  const content = clean(tags.content);
  if (content) url.searchParams.set("utm_content", content);
  return url.toString();
}
