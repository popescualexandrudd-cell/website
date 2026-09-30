import { describe, expect, it } from "vitest";
import ro from "@jungle/i18n/messages/ro.json";
import { errorText } from "./error-text";

describe("API error texts", () => {
  const errors = (ro as { errors: Record<string, string> }).errors;

  it("finds a code with a dot and fills in its parameters", () => {
    expect(errorText(errors, "ro", "accounts.too_young_for_self_registration", { min_age: 14 })).toBe(
      "Contul pentru persoanele sub 14 ani se creează de un părinte.",
    );
    expect(errorText(errors, "ro", "auth.invalid_credentials")).not.toContain("auth.");
  });

  it("gives null for an unknown or missing code", () => {
    expect(errorText(errors, "ro", "nope.nothing")).toBeNull();
    expect(errorText(errors, "ro", null)).toBeNull();
    expect(errorText(undefined, "ro", "auth.invalid_credentials")).toBeNull();
  });
});
