import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import ro from "@jungle/i18n/messages/ro.json";
import { CLIENT_NAMESPACES, pickMessages } from "./client-messages";

const SRC = join(__dirname, "..");

/** Every .tsx file under src/components and src/app that starts with "use client". */
function clientFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return clientFiles(path);
    return path.endsWith(".tsx") && readFileSync(path, "utf8").trimStart().startsWith('"use client"') ? [path] : [];
  });
}

describe("the texts sent to the browser (§9.4)", () => {
  it("picks only the given namespaces, whole", () => {
    const messages = { a: { b: { c: "1", d: "2" }, e: "3" }, f: { g: "4" } };
    expect(pickMessages(messages, ["a.b", "f", "missing.path"])).toEqual({ a: { b: { c: "1", d: "2" } }, f: { g: "4" } });
    expect(pickMessages(messages, ["a.b.c", "a.e"])).toEqual({ a: { b: { c: "1" }, e: "3" } });
  });

  it("covers every namespace a client component reads, and they all exist", () => {
    const files = [...clientFiles(join(SRC, "components")), ...clientFiles(join(SRC, "app"))];
    expect(files.length).toBeGreaterThan(5);
    // Every string in a useTranslations(...) call counts, also in a condition
    // (mode === "confirm" ? "web.confirm" : "web.unsubscribe"); a call without one cannot be checked.
    const calls = files.flatMap((file) => [...readFileSync(file, "utf8").matchAll(/useTranslations\(([^)]*)\)/g)].map((m) => m[1] as string));
    for (const call of calls) expect(call, "a namespace written in the code").toMatch(/"[^"]+"/);
    // Only strings that start with a section of the catalogue are namespaces ("confirm" in a
    // comparison is not).
    const sections = new Set(Object.keys(ro));
    const used = new Set(
      calls
        .flatMap((call) => [...call.matchAll(/"([^"]+)"/g)].map((m) => m[1] as string))
        .filter((literal) => sections.has(literal.split(".")[0] as string)),
    );
    expect(used).toContain("web.unsubscribe");
    for (const namespace of used) {
      expect(CLIENT_NAMESPACES.some((picked) => namespace === picked || namespace.startsWith(`${picked}.`)), namespace).toBe(true);
    }
    const picked = pickMessages(ro, CLIENT_NAMESPACES);
    for (const namespace of CLIENT_NAMESPACES) expect(pickMessages(picked, [namespace]), namespace).not.toEqual({});
  });

  it("leaves out what only the server or the other apps need", () => {
    const picked = pickMessages(ro, CLIENT_NAMESPACES) as Record<string, unknown>;
    expect(picked).not.toHaveProperty("admin");
    expect(picked).not.toHaveProperty("kiosk");
    expect(JSON.stringify(picked).length).toBeLessThan(JSON.stringify(ro).length / 2);
  });
});
