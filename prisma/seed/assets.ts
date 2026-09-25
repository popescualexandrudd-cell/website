/**
 * The club's own logo and photos, shipped with the site in config/assets and imported into
 * the media library once. Each file name is recorded in SiteSettings.seededAssets, so an image
 * the club later deletes in the admin never comes back.
 */
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Prisma, PrismaClient } from "../../lib/generated/prisma/client";
import { encodeVariants } from "../../lib/images/process";

const WIDTHS = [480, 960, 1440, 1920, 2560];

type Asset = {
  file: string;
  mimeType: string;
  alt: { ro: string; en: string };
  /** Where it goes: the site's logo, or a gallery photo. */
  use:
    | { kind: "logo" }
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
    alt: { ro: "Logoul Club Sportiv Elite Tenis", en: "The Elite Tenis sports club logo" },
    use: { kind: "logo" },
  },
  {
    file: "elite-podium.jpg",
    mimeType: "image/jpeg",
    alt: {
      ro: "Patru jucătoare cu medalii și diplome pe podiumul Elite Tenis Club",
      en: "Four girls with medals and diplomas on the Elite Tenis Club podium",
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
      caption: { ro: "Copiii academiei, pe zgură", en: "The academy's children, on clay" },
      order: 1,
    },
  },
];

/** Imports the assets not imported before; returns the labels of what it added. */
export async function syncClubAssets(db: PrismaClient): Promise<string[]> {
  const settings = await db.siteSettings.findUnique({
    where: { id: 1 },
    select: { seededAssets: true, logoId: true },
  });
  if (!settings) return [];
  const mediaRoot = resolve(process.env.MEDIA_DIR ?? "./storage/media");
  const added: string[] = [];
  for (const asset of ASSETS) {
    if (settings.seededAssets.includes(asset.file)) continue;
    // A logo the club already uploaded stays; the shipped one is then simply not used.
    if (asset.use.kind === "logo" && settings.logoId) {
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
