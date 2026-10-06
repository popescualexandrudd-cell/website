import { describe, expect, it } from "vitest";
import { MAX_CHARS, MAX_TURNS, lastTurns } from "./assistant";

describe("the assistant's conversation (12D)", () => {
  it("sends only what the API accepts: the last turns, trimmed and shortened, no empty ones", () => {
    const many = Array.from({ length: 25 }, (_, n) => ({ role: n % 2 ? "assistant" : "user", content: ` q${n} ` }) as const);
    const sent = lastTurns([...many, { role: "user", content: "   " }]);
    expect(sent).toHaveLength(MAX_TURNS);
    expect(sent[0]).toEqual({ role: "assistant", content: "q5" });
    expect(sent.at(-1)).toEqual({ role: "user", content: "q24" });
    expect(lastTurns([{ role: "user", content: "x".repeat(MAX_CHARS + 50) }])[0]?.content).toHaveLength(MAX_CHARS);
  });
});
