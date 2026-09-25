/**
 * The club's own logo, photos and presentation video, shipped with the site in config/assets and
 * imported into the media library once. Each file name is recorded in SiteSettings.seededAssets,
 * so an image the club later deletes in the admin never comes back.
 */
import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Prisma, PrismaClient } from "../../lib/generated/prisma/client";
import { encodeVariants } from "../../lib/images/process";

const WIDTHS = [480, 960, 1440, 1920, 2560];

type Asset = {
  file: string;
  mimeType: string;
  alt: { ro: string; en: string };
  /** Where it goes: the site's logo, the opening video, or a gallery photo. */
  use:
    | { kind: "logo" }
    /** The photo of a training programme (its card and page). */
    | { kind: "program"; slug: string }
    | {
        kind: "video";
        /** The encoded files next to it: [width, height, file]. */
        sources: [number, number, string][];
        durationSec: number;
      }
    | {
        kind: "gallery";
        category: "GRUPE" | "TURNEE";
        caption: { ro: string; en: string };
        order: number;
        /** Also the photo at the top of this page (when the page has none). */
        pageHeader?: string;
      };
};

const ASSETS: Asset[] = [
  {
    file: "elite-logo.webp",
    mimeType: "image/webp",
    alt: { ro: "Logoul Clubului Tenis Elite", en: "The Clubul Tenis Elite logo" },
    use: { kind: "logo" },
  },
  {
    // A poster frame; the video itself was composed from the club's photos (config/assets).
    file: "elite-prezentare-cadru.jpg",
    mimeType: "video/mp4",
    alt: {
      ro: "Copiii clubului pe terenurile de zgură și pe podiumul unui turneu",
      en: "The club's children on the clay courts and on a tournament podium",
    },
    use: {
      kind: "video",
      sources: [
        [1280, 720, "elite-prezentare-720.mp4"],
        [1920, 1080, "elite-prezentare-1080.mp4"],
      ],
      durationSec: 18,
    },
  },
  {
    file: "elite-podium.jpg",
    mimeType: "image/jpeg",
    alt: {
      ro: "Patru jucătoare cu medalii și diplome pe podiumul Clubului Tenis Elite",
      en: "Four girls with medals and diplomas on the Clubul Tenis Elite podium",
    },
    use: {
      kind: "gallery",
      category: "TURNEE",
      caption: { ro: "Premierea unui turneu la club", en: "Prize-giving at a club tournament" },
      order: 0,
      pageHeader: "palmares",
    },
  },
  {
    file: "elite-grupa.jpg",
    mimeType: "image/jpeg",
    alt: {
      ro: "Grupă de copii cu rachete pe terenul de zgură, cu sala acoperită în spate",
      en: "A group of children with racquets on the clay court, the covered hall behind them",
    },
    use: {
      kind: "gallery",
      category: "GRUPE",
      caption: { ro: "Copiii clubului, pe zgură", en: "The club's children, on clay" },
      order: 1,
    },
  },
  {
    file: "program-initiere.jpg",
    mimeType: "image/jpeg",
    alt: {
      ro: "Grupă de copii cu rachete pe terenul de zgură al clubului",
      en: "A group of children with racquets on the club's clay court",
    },
    use: { kind: "program", slug: "initiere" },
  },
  {
    file: "program-competitie.jpg",
    mimeType: "image/jpeg",
    alt: {
      ro: "Jucătoare cu trofeul ridicat pe podiumul unui turneu la club",
      en: "A player lifting the trophy on the podium of a club tournament",
    },
    use: { kind: "program", slug: "competitie" },
  },
  {
    file: "program-inalta-performanta.jpg",
    mimeType: "image/jpeg",
    alt: {
      ro: "Podiumul unui turneu la Clubul Tenis Elite",
      en: "The podium of a tournament at Clubul Tenis Elite",
    },
    use: { kind: "program", slug: "inalta-performanta" },
  },
  {
    file: "program-amatori.jpg",
    mimeType: "image/jpeg",
    alt: {
      ro: "Terenurile de zgură și sala acoperită a clubului",
      en: "The club's clay courts and covered hall",
    },
    use: { kind: "program", slug: "amatori" },
  },
  {
    file: "program-tabere.jpg",
    mimeType: "image/jpeg",
    alt: {
      ro: "Copii cu rachete pe terenul de zgură, cu sala acoperită în spate",
      en: "Children with racquets on the clay court, the covered hall behind them",
    },
    use: { kind: "program", slug: "tabere" },
  },
  {
    file: "program-team-building.jpg",
    mimeType: "image/jpeg",
    alt: {
      ro: "Premierea unui turneu la Clubul Tenis Elite",
      en: "Prize-giving at a Clubul Tenis Elite tournament",
    },
    use: { kind: "program", slug: "team-building" },
  },
];

/** Imports the assets not imported before; returns the labels of what it added. */
export async function syncClubAssets(db: PrismaClient): Promise<string[]> {
  const settings = await db.siteSettings.findUnique({
    where: { id: 1 },
    select: { seededAssets: true, logoId: true, heroVideoId: true },
  });
  if (!settings) return [];
  const mediaRoot = resolve(process.env.MEDIA_DIR ?? "./storage/media");
  const added: string[] = [];
  for (const asset of ASSETS) {
    if (settings.seededAssets.includes(asset.file)) continue;
    // A logo the club already uploaded stays; the shipped one is then simply not used.
    if (
      (asset.use.kind === "logo" && settings.logoId) ||
      (asset.use.kind === "video" && settings.heroVideoId)
    ) {
      await markImported(db, asset.file);
      continue;
    }
    const buffer = await readFile(join(process.cwd(), "config", "assets", asset.file));
    const baseName = asset.file.replace(/\.[a-z]+$/, "");
    const encoded = await encodeVariants({
      input: buffer,
      widths: WIDTHS,
      outDir: join(mediaRoot, "club"),
      baseName,
      publicPrefix: "/media/club",
    });
    if (asset.use.kind === "video") {
      const sources = [];
      let size = 0;
      for (const [w, h, file] of asset.use.sources) {
        await mkdir(join(mediaRoot, "club"), { recursive: true });
        await copyFile(
          join(process.cwd(), "config", "assets", file),
          join(mediaRoot, "club", file),
        );
        size += (await stat(join(mediaRoot, "club", file))).size;
        sources.push({ w, h, src: `/media/club/${file}` });
      }
      const video = await db.media.create({
        data: {
          path: `club/${baseName}`,
          kind: "VIDEO",
          status: "GATA",
          mimeType: "video/mp4",
          width: encoded.width,
          height: encoded.height,
          blurDataURL: encoded.blurDataURL,
          alt: asset.alt,
          size,
          variants: sources as unknown as Prisma.InputJsonValue,
          poster: encoded.variants as unknown as Prisma.InputJsonValue,
          durationSec: asset.use.durationSec,
          originalName: asset.file,
        },
      });
      await db.siteSettings.update({ where: { id: 1 }, data: { heroVideoId: video.id } });
      await markImported(db, asset.file);
      added.push("video-ul de prezentare");
      continue;
    }
    const media = await db.media.create({
      data: {
        path: `club/${baseName}`,
        mimeType: asset.mimeType,
        width: encoded.width,
        height: encoded.height,
        blurDataURL: encoded.blurDataURL,
        alt: asset.alt,
        size: buffer.length,
        variants: encoded.variants as unknown as Prisma.InputJsonValue,
        originalName: asset.file,
      },
    });
    if (asset.use.kind === "logo") {
      await db.siteSettings.update({ where: { id: 1 }, data: { logoId: media.id } });
    } else if (asset.use.kind === "program") {
      await db.program.updateMany({
        where: { slug: asset.use.slug, imageId: null },
        data: { imageId: media.id },
      });
    } else {
      // Photos the club published itself; the club confirms it holds the parents' consent
      // (CONTENT-TODO.md), and can unpublish them from the admin at any time.
      await db.galleryItem.create({
        data: {
          mediaId: media.id,
          alt: asset.alt,
          caption: asset.use.caption,
          category: asset.use.category,
          hasMinors: true,
          parentalConsent: true,
          consentAt: new Date(),
          published: true,
          order: asset.use.order,
        },
      });
      if (asset.use.pageHeader)
        await db.pageHeader.updateMany({
          where: { key: asset.use.pageHeader, imageId: null },
          data: { imageId: media.id },
        });
    }
    await markImported(db, asset.file);
    added.push(asset.use.kind === "logo" ? "logoul clubului" : `fotografia ${asset.file}`);
  }
  return added;
}

async function markImported(db: PrismaClient, file: string): Promise<void> {
  await db.siteSettings.update({
    where: { id: 1 },
    data: { seededAssets: { push: file } },
  });
}
