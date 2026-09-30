// R-140 / §13.3: Romanian and English must be complete; no key may be missing in either.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const load = (lang) => JSON.parse(readFileSync(new URL(`../messages/${lang}.json`, import.meta.url), "utf8"));

function flatten(obj, prefix = "") {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === "object" && value !== null ? flatten(value, `${prefix}${key}.`) : [[`${prefix}${key}`, value]],
  );
}

// An ICU argument is "{name}" or "{name, type, …}"; the text of a plural or select branch
// ("{Pachet cu # sporturi}") is not one. Romanian has more plural forms than English, so the
// names are compared as a set.
const placeholders = (text) => [...new Set([...text.matchAll(/\{\s*(\w+)\s*[,}]/g)].map((m) => m[1]))].sort();

test("ro and en have exactly the same keys", () => {
  const ro = new Map(flatten(load("ro")));
  const en = new Map(flatten(load("en")));
  assert.deepEqual([...ro.keys()].filter((k) => !en.has(k)), []);
  assert.deepEqual([...en.keys()].filter((k) => !ro.has(k)), []);
});

test("no empty translations and identical placeholders", () => {
  const en = new Map(flatten(load("en")));
  for (const [key, text] of flatten(load("ro"))) {
    assert.ok(typeof text === "string" && text.trim().length > 0, `empty ro: ${key}`);
    assert.ok(en.get(key).trim().length > 0, `empty en: ${key}`);
    assert.deepEqual(placeholders(text), placeholders(en.get(key)), `placeholders differ: ${key}`);
  }
});

test("every catalogue file is valid JSON", () => {
  for (const file of readdirSync(new URL("../messages/", import.meta.url))) {
    assert.ok(file.endsWith(".json"));
    load(file.replace(".json", ""));
  }
});
