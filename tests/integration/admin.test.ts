import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { mediaFilePath, processUpload, removeMediaFiles } from "@/lib/admin/media";
import { parseForm } from "@/lib/admin/form-values";
import { getResource } from "@/lib/admin/resources";
import { eraseClient, exportClientData } from "@/lib/gdpr";
import { countLabel, csvCell } from "@/lib/admin/format";

const mediaDir = mkdtempSync(join(tmpdir(), "media-test-"));

beforeAll(() => {
  process.env.MEDIA_DIR = mediaDir;
});
afterAll(() => {
  rmSync(mediaDir, { recursive: true, force: true });
});

function allFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath, e.name));
}

describe("media upload", () => {
  it("re-encodes photos and drops EXIF (camera and GPS data)", async () => {
    const jpeg = await sharp({
      create: { width: 1200, height: 800, channels: 3, background: { r: 200, g: 120, b: 60 } },
    })
      .jpeg()
      .withExif({
        IFD0: { Make: "TestPhone", Model: "X" },
        IFD3: { GPSLatitudeRef: "N", GPSLatitude: "44/1 25/1 0/1" },
      })
      .toBuffer();
    expect((await sharp(jpeg).metadata()).exif).toBeDefined();
    const result = await processUpload({
      buffer: jpeg,
      originalName: "IMG_0001.jpg",
      alt: { ro: "Test" },
      treatment: false,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const media = await db.media.findUniqueOrThrow({ where: { id: result.id } });
    expect(media.width).toBe(1200);
    const files = allFiles(mediaDir);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const meta = await sharp(readFileSync(file)).metadata();
      expect(meta.exif).toBeUndefined();
      expect(["webp", "heif"]).toContain(meta.format);
    }
    await removeMediaFiles(media);
    await db.media.delete({ where: { id: media.id } });
    expect(allFiles(mediaDir)).toHaveLength(0);
  });

  it("refuses SVG, non-images and oversized files", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>',
    );
    expect(
      (
        await processUpload({
          buffer: svg,
          originalName: "a.svg",
          alt: { ro: "x" },
          treatment: false,
        })
      ).ok,
    ).toBe(false);
    const text = Buffer.from("not an image");
    expect(
      (
        await processUpload({
          buffer: text,
          originalName: "a.jpg",
          alt: { ro: "x" },
          treatment: false,
        })
      ).ok,
    ).toBe(false);
    const big = Buffer.alloc(10 * 1024 * 1024 + 1);
    expect(
      (
        await processUpload({
          buffer: big,
          originalName: "a.jpg",
          alt: { ro: "x" },
          treatment: false,
        })
      ).ok,
    ).toBe(false);
  });

  it("never resolves a media path outside MEDIA_DIR", () => {
    expect(mediaFilePath(["..", "package.json"])).toBeNull();
    expect(mediaFilePath(["2026", "..", "..", "x"])).toBeNull();
    expect(mediaFilePath(["2026", "09", "a.webp"])).toBe(join(mediaDir, "2026", "09", "a.webp"));
  });
});

describe("content editor parsing", () => {
  it("reads only declared fields and validates them", () => {
    const resource = getResource("intrebari");
    if (!resource) throw new Error("missing resource");
    const form = new FormData();
    form.set("f.question.ro", "  Cât durează o lecție?  ");
    form.set("f.question.en", "");
    form.set("f.answer.ro", "O oră.");
    form.set("f.category", "INCEPUT");
    form.set("f.showOnHome", "on");
    form.set("f.programId", "");
    form.set("f.order", "999");
    form.set("id", "hijack");
    const { data, errors } = parseForm(resource.fields, form, "Europe/Bucharest");
    expect(errors).toEqual({});
    expect(data.question).toEqual({ ro: "Cât durează o lecție?" });
    expect(data.showOnHome).toBe(true);
    expect(data.programId).toBeNull();
    expect("order" in data).toBe(false);
    expect("id" in data).toBe(false);
  });

  it("reports missing Romanian text, bad enums, slugs and prices", () => {
    const program = getResource("programe");
    const pricing = getResource("preturi");
    if (!program || !pricing) throw new Error("missing resource");
    const form = new FormData();
    form.set("f.slug", "Lecții Copii");
    form.set("f.audience", "ALTCEVA");
    const parsed = parseForm(program.fields, form, "Europe/Bucharest");
    expect(parsed.errors.name).toBeDefined();
    expect(parsed.errors.slug).toBeDefined();
    expect(parsed.errors.audience).toBeDefined();
    const priceForm = new FormData();
    priceForm.set("f.price", "250,5");
    expect(
      parseForm(
        pricing.fields.filter((f) => f.name === "price"),
        priceForm,
        "Europe/Bucharest",
      ).data.price,
    ).toBe("250.5");
    priceForm.set("f.price", "=1+1");
    expect(
      parseForm(
        pricing.fields.filter((f) => f.name === "price"),
        priceForm,
        "Europe/Bucharest",
      ).errors.price,
    ).toBeDefined();
  });

  it("reads the durations of a lesson type as a sorted list of minutes", () => {
    const lessons = getResource("lectii");
    if (!lessons) throw new Error("missing resource");
    const durations = lessons.fields.filter((f) => f.name === "durations");
    const form = new FormData();
    form.set("f.durations", "120, 60 90;60");
    expect(parseForm(durations, form, "Europe/Bucharest").data.durations).toEqual([60, 90, 120]);
    form.set("f.durations", "60, o oră");
    expect(parseForm(durations, form, "Europe/Bucharest").errors.durations).toBeDefined();
    form.set("f.durations", "10");
    expect(parseForm(durations, form, "Europe/Bucharest").errors.durations).toBeDefined();
    form.set("f.durations", "");
    expect(parseForm(durations, form, "Europe/Bucharest").errors.durations).toBeDefined();
  });

  it("refuses to publish a gallery photo with minors without parental consent", () => {
    const gallery = getResource("galerie");
    if (!gallery?.prepare) throw new Error("missing resource");
    expect(
      gallery.prepare({ published: true, hasMinors: true, parentalConsent: false }, null),
    ).toMatch(/minori/);
    const ok = { published: true, hasMinors: true, parentalConsent: true } as Record<
      string,
      unknown
    >;
    expect(gallery.prepare(ok, null)).toBeNull();
    expect(ok.consentAt).toBeInstanceOf(Date);
  });

  it("bumps the legal page version when its text changes", () => {
    const legal = getResource("legal");
    if (!legal?.prepare) throw new Error("missing resource");
    const data: Record<string, unknown> = { body: { ro: "nou" }, version: "2026-01-01" };
    legal.prepare(data, { id: "x", body: { ro: "vechi" }, version: "2026-01-01" });
    expect(data.version).toBe(new Date().toISOString().slice(0, 10));
  });
});

describe("GDPR", () => {
  // Unique per run: the test database is reused between runs.
  const run = Math.random().toString(36).slice(2, 8);
  it("exports and then erases a client, keeping anonymised bookings", async () => {
    const program = await db.program.findFirstOrThrow();
    const client = await db.client.create({
      data: { name: "Maria Ionescu", email: `maria.${run}@example.com`, phone: "0722000009" },
    });
    const booking = await db.booking.create({
      data: {
        code: `TN-M${run}`,
        programId: program.id,
        clientId: client.id,
        startsAt: new Date(Date.now() - 10 * 86_400_000),
        endsAt: new Date(Date.now() - 10 * 86_400_000 + 3_600_000),
        blockedUntil: new Date(Date.now() - 10 * 86_400_000 + 4_200_000),
        status: "EFECTUATA",
        name: "Maria Ionescu",
        email: `maria.${run}@example.com`,
        phone: "0722000009",
        gdprConsent: true,
        gdprConsentAt: new Date(),
        policyVersion: "test",
        cancelTokenHash: `gdpr-1-${run}`,
      },
    });
    await db.contactMessage.create({
      data: {
        name: "Maria",
        email: `maria.${run}@example.com`,
        message: "Bună ziua",
        consent: true,
        consentAt: new Date(),
        policyVersion: "test",
      },
    });

    const exported = await exportClientData(client.id);
    expect(exported?.bookings).toHaveLength(1);
    expect(exported?.contactMessages).toHaveLength(1);
    expect(JSON.stringify(exported)).not.toContain(`gdpr-1-${run}`);

    const result = await eraseClient(client.id);
    expect(result.ok).toBe(true);
    expect(await db.client.findUnique({ where: { id: client.id } })).toBeNull();
    const anonymised = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(anonymised.name).toBe("Anonimizat");
    expect(anonymised.email).not.toContain("maria");
    expect(anonymised.anonymizedAt).not.toBeNull();
    expect(await db.contactMessage.count({ where: { email: `maria.${run}@example.com` } })).toBe(0);
  });

  it("refuses to erase a client with an upcoming active lesson", async () => {
    const program = await db.program.findFirstOrThrow();
    const client = await db.client.create({
      data: { name: "Dan", email: `dan.${run}@example.com` },
    });
    // Far in the future and at a random hour, so it never overlaps another test booking.
    const start = new Date(Date.now() + (400 + Math.floor(Math.random() * 300)) * 86_400_000);
    await db.booking.create({
      data: {
        code: `TN-D${run}`,
        programId: program.id,
        clientId: client.id,
        startsAt: start,
        endsAt: new Date(start.getTime() + 3_600_000),
        blockedUntil: new Date(start.getTime() + 4_200_000),
        status: "CONFIRMATA",
        name: "Dan",
        email: `dan.${run}@example.com`,
        phone: "0722000010",
        gdprConsent: true,
        gdprConsentAt: new Date(),
        policyVersion: "test",
        cancelTokenHash: `gdpr-2-${run}`,
      },
    });
    const result = await eraseClient(client.id);
    expect(result.ok).toBe(false);
    await db.booking.deleteMany({ where: { clientId: client.id } });
    await db.client.delete({ where: { id: client.id } });
  });
});

describe("admin formatting", () => {
  it("uses the Romanian plural with „de”", () => {
    expect(countLabel(1, "client", "clienți")).toBe("1 client");
    expect(countLabel(5, "client", "clienți")).toBe("5 clienți");
    expect(countLabel(20, "client", "clienți")).toBe("20 de clienți");
    expect(countLabel(101, "client", "clienți")).toBe("101 clienți");
    expect(countLabel(0, "client", "clienți")).toBe("0 clienți");
  });

  it("neutralises spreadsheet formulas in CSV cells", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
    expect(csvCell('Ana "Mia"')).toBe(`"Ana ""Mia"""`);
  });
});
