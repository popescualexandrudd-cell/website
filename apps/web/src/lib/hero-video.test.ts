import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { heroVideo, manifestFrom } from "./hero-video";

const good = {
  poster: "/media/hero/hero-poster.jpg",
  illustrative: false,
  desktop: { mp4: "/media/hero/hero-1080.mp4", webm: "/media/hero/hero-1080.webm" },
  mobile: { mp4: "/media/hero/hero-720.mp4", webm: "/media/hero/hero-720.webm" },
};

describe("the hero video's files (ADR-0023)", () => {
  it("takes only a manifest as the script writes it", () => {
    expect(manifestFrom({ ...good, version: 1 })).toEqual(good);
    expect(manifestFrom({ ...good, illustrative: true })?.illustrative).toBe(true);
    expect(manifestFrom({ ...good, illustrative: "yes" })?.illustrative).toBe(false);
    expect(manifestFrom({ ...good, desktop: { mp4: "https://elsewhere.test/v.mp4", webm: good.desktop.webm } })).toBeNull();
    expect(manifestFrom({ ...good, poster: "/media/hero/../../x.jpg" })).toBeNull();
    expect(manifestFrom({ ...good, mobile: null })).toBeNull();
    expect(manifestFrom(null)).toBeNull();
  });

  it("no manifest, or a broken one, means no video: the hero stays as it is", () => {
    const dir = mkdtempSync(join(tmpdir(), "hero-"));
    expect(heroVideo(join(dir, "missing.json"))).toBeNull();
    writeFileSync(join(dir, "broken.json"), "{");
    expect(heroVideo(join(dir, "broken.json"))).toBeNull();
    writeFileSync(join(dir, "manifest.json"), JSON.stringify(good));
    expect(heroVideo(join(dir, "manifest.json"))).toEqual(good);
  });
});
