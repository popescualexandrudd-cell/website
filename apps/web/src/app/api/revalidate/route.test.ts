/** ADR-0022: the backend refreshes the site's pages after a change, only with the shared secret. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag: (...args: unknown[]) => revalidateTag(...args) }));

const { POST } = await import("./route");

const call = (body: unknown, secret?: string) =>
  POST(
    new Request("http://localhost/api/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(secret === undefined ? {} : { "X-Revalidate-Secret": secret }) },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

describe("POST /api/revalidate", () => {
  beforeEach(() => {
    revalidateTag.mockClear();
    vi.stubEnv("REVALIDATE_SECRET", "s3cret-value");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("drops the cached flags at once with the right secret", async () => {
    const response = await call({ tags: ["flags", "config"] }, "s3cret-value");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ revalidated: true, tags: ["flags", "config"] });
    expect(revalidateTag.mock.calls).toEqual([
      ["flags", { expire: 0 }],
      ["config", { expire: 0 }],
    ]);
  });

  it("drops the club's calendar when an event changes (§9.2.12)", async () => {
    const response = await call({ tags: ["events"] }, "s3cret-value");
    expect(response.status).toBe(200);
    expect(revalidateTag.mock.calls).toEqual([["events", { expire: 0 }]]);
  });

  it("drops the café menu when it changes (§9.2.13)", async () => {
    expect((await call({ tags: ["cafe"] }, "s3cret-value")).status).toBe(200);
    expect(revalidateTag.mock.calls).toEqual([["cafe", { expire: 0 }]]);
  });

  it("refuses a wrong or missing secret, unknown tags and a bad body", async () => {
    expect((await call({ tags: ["flags"] }, "wrong-value!")).status).toBe(401);
    expect((await call({ tags: ["flags"] }, "short")).status).toBe(401);
    expect((await call({ tags: ["flags"] })).status).toBe(401);
    expect((await call({ tags: ["users"] }, "s3cret-value")).status).toBe(400);
    expect((await call({ tags: [] }, "s3cret-value")).status).toBe(400);
    expect((await call({ tags: "flags" }, "s3cret-value")).status).toBe(400);
    expect((await call("not json", "s3cret-value")).status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("does not exist without a configured secret", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "");
    expect((await call({ tags: ["flags"] }, "")).status).toBe(404);
  });
});
