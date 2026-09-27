import { describe, expect, it } from "vitest";
import { errorKey, errorParams } from "./api";

const known = (code: string) => ["auth.rate_limited", "legal.consent_missing"].includes(code);

describe("errorKey (ADR-0018: API codes are translated in the interface)", () => {
  it("returns a known code", () => {
    expect(errorKey({ error: { code: "auth.rate_limited", params: {} } }, known)).toBe("auth.rate_limited");
  });
  it("ignores unknown or malformed codes", () => {
    expect(errorKey({ error: { code: "something.new" } }, known)).toBeNull();
    expect(errorKey({ error: { code: "../../etc" } }, known)).toBeNull();
    expect(errorKey(undefined, known)).toBeNull();
    expect(errorKey("oops", known)).toBeNull();
  });
});

describe("errorParams", () => {
  it("keeps only primitive values for message formatting", () => {
    expect(errorParams({ error: { code: "x", params: { retry_after_seconds: 60, kind: "terms", nested: { a: 1 } } } })).toEqual({
      retry_after_seconds: 60,
      kind: "terms",
    });
    expect(errorParams(null)).toEqual({});
  });
});
