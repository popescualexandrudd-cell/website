// WCAG 2.2 (ADR-0020): text colours must stay readable on every night surface
// (body and headings AAA 7:1; captions, links and accents AA 4.5:1; focus ring 3:1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const c = JSON.parse(readFileSync(new URL("../tokens/color.json", import.meta.url), "utf8")).color;

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const surfaces = ["950", "900", "800", "700"].map((k) => c.night[k].$value);

test("body and heading text reach AAA (7:1) on every night surface", () => {
  for (const bg of surfaces) for (const fg of [c.bone["50"].$value, c.bone["200"].$value]) {
    assert.ok(ratio(fg, bg) >= 7, `${fg} on ${bg}: ${ratio(fg, bg).toFixed(2)}`);
  }
});

test("captions, brass links, success and error text reach AA (4.5:1) on every night surface", () => {
  for (const bg of surfaces) for (const fg of [c.bone["400"].$value, c.brass["300"].$value, c.brass["400"].$value, c.forest["400"].$value, c.danger.$value]) {
    assert.ok(ratio(fg, bg) >= 4.5, `${fg} on ${bg}: ${ratio(fg, bg).toFixed(2)}`);
  }
});

test("night text on brass buttons reaches AAA", () => {
  for (const bg of [c.brass["400"].$value, c.brass["300"].$value]) {
    assert.ok(ratio(c.night["900"].$value, bg) >= 7, `night on ${bg}: ${ratio(c.night["900"].$value, bg).toFixed(2)}`);
  }
});

test("focus ring and input outlines are visible (3:1 non-text contrast)", () => {
  for (const bg of surfaces) {
    assert.ok(ratio(c.focus.$value, bg) >= 3, `focus on ${bg}`);
  }
  for (const bg of surfaces) assert.ok(ratio(c.bone["400"].$value, bg) >= 3, `input outline on ${bg}`);
});
