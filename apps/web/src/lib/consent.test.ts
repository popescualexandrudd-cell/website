import { describe, expect, it } from "vitest";
import { CONSENT_MAX_AGE_S, parseConsent, serializeConsent } from "./consent";

const cookieOf = (header: string) => header.split(";")[0] ?? "";

describe("cookie consent (§12.2)", () => {
  it("round-trips the visitor's choice", () => {
    const header = serializeConsent(true, 1_800_000_000_000, true);
    expect(parseConsent(`other=1; ${cookieOf(header)}`)).toEqual({ v: 1, stats: true, ts: 1_800_000_000_000 });
    expect(parseConsent(cookieOf(serializeConsent(false, 5, false)))?.stats).toBe(false);
  });

  it("keeps the choice for 12 months, site-wide, secure over HTTPS", () => {
    const header = serializeConsent(false, 1, true);
    expect(header).toContain(`Max-Age=${CONSENT_MAX_AGE_S}`);
    expect(CONSENT_MAX_AGE_S).toBe(31_536_000);
    expect(header).toContain("Path=/");
    expect(header).toContain("SameSite=Lax");
    expect(header).toMatch(/; Secure$/);
    expect(serializeConsent(false, 1, false)).not.toContain("Secure");
  });

  it("asks again when the cookie is missing, malformed or from another policy version", () => {
    expect(parseConsent("")).toBeNull();
    expect(parseConsent("jp_consent=not-json")).toBeNull();
    expect(parseConsent("jp_consent=null")).toBeNull();
    expect(parseConsent(`jp_consent=${encodeURIComponent('{"v":0,"stats":true,"ts":1}')}`)).toBeNull();
    expect(parseConsent(`jp_consent=${encodeURIComponent('{"v":1,"stats":"yes","ts":1}')}`)).toBeNull();
    expect(parseConsent(`jp_consent=${encodeURIComponent('{"v":1,"stats":true}')}`)).toBeNull();
  });
});
