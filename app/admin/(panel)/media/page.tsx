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
      const sources = Array.isArray(m.variants)
        ? (m.variants as { w?: number; src?: unknown }[])
        : [];
      const smallest = sources
        .filter((v) => typeof v.src === "string")
        .sort((a, b) => (a.w ?? 0) - (b.w ?? 0))[0];
      return {
        id: m.id,
        url: thumbUrl(m.kind === "VIDEO" ? m.poster : m.variants),
        altRo: t(m.alt, "ro"),
        altEn: typeof alt?.en === "string" ? alt.en : "",
        width: m.width,
        height: m.height,
        size: size(m.size),
        uploaded: m.createdAt.toLocaleDateString("ro-RO"),
        usage: await mediaUsage(m.id),
        kind: m.kind,
        status: m.status,
        error: m.error,
        videoSrc: m.status === "GATA" && smallest ? String(smallest.src) : null,
        durationSec: m.durationSec,
      };
    }),
  );
  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-title">Media</h1>
          <p>
            Fotografiile și video-urile clubului. La încărcare, fiecare fotografie e convertită în
            formate moderne, micșorată pentru telefon și curățată de datele ascunse (locație GPS,
            model de telefon). Video-urile sunt convertite în MP4 pentru orice browser, în două
            mărimi (telefon și ecran mare), tot fără datele ascunse.
          </p>
        </div>
      </div>
      {deleted ? <p className="admin-ok mb-4">Fișierul a fost șters.</p> : null}
      <p className="admin-warning">
        Fotografiile și video-urile cu copii se publică doar cu acordul scris al părinților. În
        Galerie bifezi acordul pentru fiecare fișier.
      </p>
      <MediaLibrary items={items} />
    </>
  );
}
