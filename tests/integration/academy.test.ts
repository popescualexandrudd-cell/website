import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getResource } from "@/lib/admin/resources";
import { siteReadiness } from "@/lib/admin/readiness";
import { getAcademyGroups, getCoaches, getGallery, getResults } from "@/lib/content";
import {
  ffmpegAvailable,
  incomingFile,
  newMediaPath,
  processVideo,
  ensureIncomingDir,
} from "@/lib/video";
import { mediaUsage, removeMediaFiles } from "@/lib/admin/media";

const mediaDir = mkdtempSync(join(tmpdir(), "media-video-"));
process.env.MEDIA_DIR = mediaDir;

beforeAll(() => {
  process.env.MEDIA_DIR = mediaDir;
});
afterAll(() => {
  rmSync(mediaDir, { recursive: true, force: true });
});

describe("club template content", () => {
  it("seeds the club, its head coach and the junior academy's stages from config/club.yml", async () => {
    const settings = await db.siteSettings.findUniqueOrThrow({ where: { id: 1 } });
    expect(settings.colorBrand).toMatch(/^#[0-9a-f]{6}$/);
    const coaches = await getCoaches("ro");
    expect(coaches[0]?.isHead).toBe(true);
    expect(coaches[0]?.certifications.length).toBeGreaterThan(0);
    const groups = await getAcademyGroups("ro");
    expect(groups.map((g) => g.stage)).toEqual(["ROSU", "PORTOCALIU", "VERDE", "GALBEN"]);
    // Nothing about the club's schedule is invented: it stays visibly missing.
    expect(groups[0]?.schedule).toContain("[DE COMPLETAT]");
    expect(groups[0]?.monthlyFee).toBeNull();
  });

  it("keeps a single head coach", async () => {
    const resource = getResource("antrenori");
    if (!resource?.afterSave) throw new Error("missing coach resource");
    const previousHead = (await db.coach.findFirstOrThrow({ where: { isHead: true } })).id;
    const second = await db.coach.create({
      data: {
        slug: "antrenor-test",
        name: "Antrenor Test",
        role: { ro: "Antrenor" },
        title: { ro: "Antrenor de tenis" },
        summary: { ro: "Test." },
        story: { ro: "Test." },
        specialties: { ro: [] },
        languages: [],
        isHead: true,
        order: 9,
      },
    });
    await resource.afterSave(second as unknown as Parameters<typeof resource.afterSave>[0]);
    const heads = await db.coach.findMany({ where: { isHead: true } });
    expect(heads.map((c) => c.slug)).toEqual(["antrenor-test"]);
    // Restore the seeded head coach.
    await db.coach.delete({ where: { id: second.id } });
    await db.coach.update({ where: { id: previousHead }, data: { isHead: true } });
  });

  it("refuses brand colours that white text cannot be read on", () => {
    const settings = getResource("setari");
    if (!settings?.prepare) throw new Error("missing settings resource");
    expect(settings.prepare({ colorBrand: "#0f3b2f", colorAccent: "#f2d34a" }, null)).toMatch(
      /prea deschisă/,
    );
    expect(settings.prepare({ colorBrand: "green", colorAccent: "#c24f1d" }, null)).toMatch(
      /#rrggbb/,
    );
    const ok = { colorBrand: "#0F3B2F", colorAccent: "#c24f1d" };
    expect(settings.prepare(ok, null)).toBeNull();
    expect(ok.colorBrand).toBe("#0f3b2f");
  });

  it("publishes a minor's result only with the parents' consent", async () => {
    const resource = getResource("rezultate");
    if (!resource?.prepare) throw new Error("missing results resource");
    expect(
      resource.prepare({ published: true, isMinor: true, parentalConsent: false }, null),
    ).toMatch(/acordul scris al părinților/);
    const date = new Date("2026-06-01T00:00:00Z");
    const base = { event: "Turneu test", category: "U12", placement: { ro: "Locul 1" }, date };
    await db.result.createMany({
      data: [
        { ...base, athlete: "Ana P.", isMinor: true, parentalConsent: true, published: true },
        { ...base, athlete: "Ion M.", isMinor: true, parentalConsent: false, published: true },
        { ...base, athlete: "Dan C.", isMinor: false, published: false },
      ],
    });
    const shown = await getResults("ro");
    expect(shown.map((r) => r.athlete)).toEqual(["Ana P."]);
    await db.result.deleteMany({ where: { event: "Turneu test" } });
  });
});

describe("site readiness", () => {
  it("lists what the club still has to provide, each with where to do it", async () => {
    const items = await siteReadiness();
    expect(items.length).toBeGreaterThanOrEqual(8);
    for (const item of items) expect(item.href).toMatch(/^\/admin\//);
    const groups = items.find((i) => i.label.startsWith("Programul și taxa"));
    // The seeded groups have no schedule or fee: nothing is invented for the club.
    expect(groups?.done).toBe(false);
    expect(groups?.detail).toMatch(/fără taxă lunară/);
  });
});

describe("videos", () => {
  it("counts where a video is used (the opening, a coach) so it cannot be deleted there", async () => {
    const media = await db.media.create({
      data: {
        path: newMediaPath(),
        kind: "VIDEO",
        status: "GATA",
        mimeType: "video/mp4",
        width: 1280,
        height: 720,
        blurDataURL: "",
        alt: { ro: "Antrenament" },
        size: 1,
        variants: [],
      },
    });
    await db.siteSettings.update({ where: { id: 1 }, data: { heroVideoId: media.id } });
    expect(await mediaUsage(media.id)).toBe(1);
    await db.siteSettings.update({ where: { id: 1 }, data: { heroVideoId: null } });
    await db.media.delete({ where: { id: media.id } });
  });

  it("converts an upload to MP4 with a poster, drops the original and publishes it", async () => {
    if (!(await ffmpegAvailable())) {
      console.warn("ffmpeg lipsește: testul de conversie video e sărit (setează FFMPEG_PATH).");
      return;
    }
    const path = newMediaPath();
    await ensureIncomingDir();
    const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
    // A 2-second test clip carrying a GPS position, as a phone would record it.
    execFileSync(ffmpeg, [
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "testsrc2=size=640x360:rate=25",
      "-t",
      "2",
      "-metadata",
      "location=+44.4268+026.1025/",
      "-c:v",
      "libx264",
      "-f",
      "mp4",
      incomingFile(path),
    ]);
    const media = await db.media.create({
      data: {
        path,
        kind: "VIDEO",
        status: "IN_PROCESARE",
        mimeType: "video/mp4",
        width: 0,
        height: 0,
        blurDataURL: "",
        alt: { ro: "Test" },
        size: 1,
        variants: [],
      },
    });
    expect(await processVideo(media.id)).toBe(true);
    // A second run finds nothing to do.
    expect(await processVideo(media.id)).toBe(false);
    const done = await db.media.findUniqueOrThrow({ where: { id: media.id } });
    expect(done.status).toBe("GATA");
    expect(done.width).toBe(640);
    expect(done.durationSec).toBeGreaterThan(1.5);
    expect(existsSync(incomingFile(path))).toBe(false);
    const files = readdirSync(join(mediaDir, path.split("/").slice(0, 2).join("/")));
    expect(files.some((f) => f.endsWith(".mp4"))).toBe(true);
    expect(files.some((f) => f.includes("-cadru-"))).toBe(true);
    // The converted file no longer carries the position.
    const mp4 = files.find((f) => f.endsWith(".mp4"))!;
    let report = "";
    try {
      execFileSync(
        ffmpeg,
        ["-hide_banner", "-i", join(mediaDir, path.split("/").slice(0, 2).join("/"), mp4)],
        {
          stdio: "pipe",
        },
      );
    } catch (error) {
      report = String((error as { stderr?: Buffer }).stderr ?? "");
    }
    expect(report).toContain("Video: h264");
    expect(report).not.toContain("location");

    const item = await db.galleryItem.create({
      data: { mediaId: media.id, alt: { ro: "Antrenament" }, published: true },
    });
    const gallery = await getGallery("ro");
    const shown = gallery.find((g) => g.id === item.id);
    expect(shown?.kind).toBe("video");
    expect(shown?.video?.sources[0]?.src).toMatch(/\.mp4$/);
    await db.galleryItem.delete({ where: { id: item.id } });
    await removeMediaFiles(done);
    await db.media.delete({ where: { id: media.id } });
  });
});
