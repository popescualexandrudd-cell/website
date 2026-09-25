import { describe, expect, it } from "vitest";
import { parseProbe, targetSizes } from "@/lib/video";
import { parseRange } from "@/lib/range";
import { contrastWithWhite } from "@/lib/color";
import { resolveVideo } from "@/lib/media";
import { safeHref } from "@/components/home/links";

const REPORT = `Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'clip.mov':
  Metadata:
    location        : +44.4268+026.1025/
  Duration: 00:01:02.48, start: 0.000000, bitrate: 8123 kb/s
  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(tv, bt709, progressive), 1920x1080, 7990 kb/s, 29.97 fps
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 48000 Hz, stereo, fltp, 128 kb/s
At least one output file must be specified`;

describe("video conversion", () => {
  it("reads the duration and the frame size from ffmpeg's report", () => {
    expect(parseProbe(REPORT)).toEqual({
      hasVideo: true,
      durationSec: 62.48,
      width: 1920,
      height: 1080,
    });
    expect(parseProbe("Stream #0:0: Audio: mp3, 44100 Hz\nDuration: 00:00:05.00").hasVideo).toBe(
      false,
    );
  });

  it("encodes 720p always and 1080p only for large sources, never upscaling", () => {
    expect(targetSizes(3840)).toEqual([1280, 1920]);
    expect(targetSizes(1920)).toEqual([1280, 1920]);
    expect(targetSizes(1280)).toEqual([1280]);
    expect(targetSizes(848)).toEqual([848]);
    expect(targetSizes(721)).toEqual([720]);
  });

  it("shows a video only once it is converted, smallest encoding first", () => {
    const base = {
      width: 1920,
      height: 1080,
      blurDataURL: "data:image/webp;base64,AA",
      kind: "VIDEO" as const,
      poster: [{ w: 480, avif: "/media/a.avif", webp: "/media/a.webp" }],
      variants: [
        { w: 1920, h: 1080, src: "/media/v-1920.mp4" },
        { w: 1280, h: 720, src: "/media/v-1280.mp4" },
      ],
    };
    expect(resolveVideo({ ...base, status: "IN_PROCESARE" })).toBeNull();
    const video = resolveVideo({ ...base, status: "GATA", durationSec: 12 });
    expect(video?.sources.map((s) => s.w)).toEqual([1280, 1920]);
    expect(video?.poster?.fallback).toBe("/media/a.webp");
    expect(resolveVideo({ ...base, kind: "IMAGINE", status: "GATA" })).toBeNull();
  });

  it("answers byte ranges the way video players ask for them", () => {
    expect(parseRange("bytes=0-", 1000)).toEqual([0, 999]);
    expect(parseRange("bytes=100-199", 1000)).toEqual([100, 199]);
    expect(parseRange("bytes=-100", 1000)).toEqual([900, 999]);
    expect(parseRange("bytes=900-5000", 1000)).toEqual([900, 999]);
    expect(parseRange("bytes=1000-", 1000)).toBeNull();
    expect(parseRange("bytes=5-2", 1000)).toBeNull();
    expect(parseRange("items=0-1", 1000)).toBeNull();
  });
});

describe("club identity", () => {
  it("keeps white text readable on the brand colours", () => {
    expect(contrastWithWhite("#0f3b2f")).toBeGreaterThan(7);
    expect(contrastWithWhite("#c24f1d")).toBeGreaterThan(4.5);
    expect(contrastWithWhite("#ffff00")).toBeLessThan(2);
    expect(contrastWithWhite("#000000")).toBeCloseTo(21, 0);
  });

  it("links section buttons only to known pages, with an optional anchor", () => {
    expect(safeHref("/academie")).toBe("/academie");
    expect(safeHref("/academie#evaluare")).toEqual({ pathname: "/academie", hash: "evaluare" });
    expect(safeHref("/academie#<script>")).toBe("/academie");
    expect(safeHref("https://example.com")).toBeNull();
    expect(safeHref("/admin")).toBeNull();
  });
});
