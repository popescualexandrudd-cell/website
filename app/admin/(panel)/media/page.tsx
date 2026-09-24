import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n-content";
import { mediaUsage, thumbUrl } from "@/lib/admin/media";
import { MediaLibrary, type LibraryItem } from "@/components/admin/MediaLibrary";

export const metadata: Metadata = { title: "Media" };

function size(bytes: number): string {
  return bytes >= 1_048_576
    ? `${(bytes / 1_048_576).toFixed(1).replace(".", ",")} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

export default async function MediaPage({ searchParams }: PageProps<"/admin/media">) {
  await requireAdmin();
  const deleted = (await searchParams).sters === "1";
  const rows = await db.media.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  const items: LibraryItem[] = await Promise.all(
    rows.map(async (m) => {
      const alt = m.alt as { en?: unknown } | null;
      return {
        id: m.id,
        url: thumbUrl(m.variants),
        altRo: t(m.alt, "ro"),
        altEn: typeof alt?.en === "string" ? alt.en : "",
        width: m.width,
        height: m.height,
        size: size(m.size),
        uploaded: m.createdAt.toLocaleDateString("ro-RO"),
        usage: await mediaUsage(m.id),
      };
    }),
  );
  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-title">Media</h1>
          <p>
            Fotografiile tale. La încărcare, fiecare fotografie e convertită în formate moderne,
            micșorată pentru telefon și curățată de datele ascunse (locație GPS, model de telefon).
          </p>
        </div>
      </div>
      {deleted ? <p className="admin-ok mb-4">Fotografia a fost ștearsă.</p> : null}
      <p className="admin-warning">
        Fotografiile cu copii se publică doar cu acordul scris al părinților. În Galerie bifezi
        acordul pentru fiecare fotografie.
      </p>
      <MediaLibrary items={items} />
    </>
  );
}
