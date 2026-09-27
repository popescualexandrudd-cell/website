// WCAG 2.2 AA (ADR-0020): text colours must stay readable on the dark backgrounds.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const colors = JSON.parse(readFileSync(new URL("../tokens/color.json", import.meta.url), "utf8")).color;

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const backgrounds = [colors.night["950"].$value, colors.night["900"].$value, colors.night["800"].$value];

test("body text colours reach 4.5:1 on every dark background", () => {
  for (const bg of backgrounds) {
    for (const fg of [colors.sand["100"].$value, colors.sand["300"].$value, colors.lagoon["400"].$value,
      colors.orchid["400"].$value, colors.firefly["400"].$value, colors.toucan["400"].$value]) {
      assert.ok(ratio(fg, bg) >= 4.5, `${fg} on ${bg}: ${ratio(fg, bg).toFixed(2)}`);
    }
  }
});

test("dark text on the orchid button reaches 4.5:1", () => {
  assert.ok(ratio(colors.night["950"].$value, colors.orchid["500"].$value) >= 4.5);
});
