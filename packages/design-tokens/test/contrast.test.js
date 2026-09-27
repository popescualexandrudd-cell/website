// WCAG 2.2 (ADR-0020): text colours must stay readable on the light surfaces (AA 4.5:1; body text AAA 7:1).
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
const surfaces = [c.surface["0"].$value, c.surface["50"].$value, c.surface["100"].$value];

test("body and heading text reach AAA (7:1) on every light surface", () => {
  for (const bg of surfaces) for (const fg of [c.ink["900"].$value, c.ink["700"].$value, c.navy["900"].$value]) {
    assert.ok(ratio(fg, bg) >= 7, `${fg} on ${bg}: ${ratio(fg, bg).toFixed(2)}`);
  }
});

test("captions, links and accents reach AA (4.5:1) on every light surface", () => {
  for (const bg of surfaces) for (const fg of [c.ink["500"].$value, c.emerald["700"].$value, c.metal.champagne.$value, c.focus.$value, c.danger.$value]) {
    assert.ok(ratio(fg, bg) >= 4.5, `${fg} on ${bg}: ${ratio(fg, bg).toFixed(2)}`);
  }
});

test("white text on navy and emerald buttons reaches AA", () => {
  for (const bg of [c.navy["900"].$value, c.navy["700"].$value, c.emerald["700"].$value]) {
    assert.ok(ratio("#FFFFFF", bg) >= 4.5, `white on ${bg}: ${ratio("#FFFFFF", bg).toFixed(2)}`);
  }
});
