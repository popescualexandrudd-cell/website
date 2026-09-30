import { describe, expect, it } from "vitest";
import { companyDetails, telHref } from "./company";

const answer = (body: unknown, ok = true) => (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

describe("the company details (Q26) and the call button (Q34)", () => {
  it("reads the details from the API, or none", async () => {
    expect(await companyDetails(answer({ phone: "0722 000 000" }))).toEqual({ phone: "0722 000 000" });
    expect(await companyDetails(answer({}, false))).toBeNull();
    const down = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await companyDetails(down)).toBeNull();
  });

  it("makes a tel: link only from a phone number", () => {
    expect(telHref("0722 000 000")).toBe("tel:0722000000");
    expect(telHref("+40 (722) 000-000")).toBe("tel:+40722000000");
    expect(telHref("")).toBeNull();
    expect(telHref(null)).toBeNull();
    expect(telHref("javascript:alert(1)")).toBeNull();
  });
});
