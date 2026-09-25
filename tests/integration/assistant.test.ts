import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

// The route reads the visitor's IP and the preview mode from the request; outside Next.js the
// test supplies them.
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.77" }),
  draftMode: async () => ({ isEnabled: false }),
}));

type Seen = { url: string; headers: IncomingHttpHeaders; body: Record<string, unknown> };
const seen: Seen[] = [];
let server: Server;

/** A stand-in for the Anthropic API: streams a short answer, or a refusal. */
beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => (raw += chunk.toString()));
    req.on("end", () => {
      const body = JSON.parse(raw) as Record<string, unknown>;
      seen.push({ url: req.url ?? "", headers: req.headers, body });
      const messages = body.messages as { content: string }[];
      const refuse = messages.at(-1)?.content.includes("REFUZ");
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      const send = (type: string, data: object) =>
        res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
      send("message_start", {
        message: {
          id: "msg_test",
          type: "message",
          role: "assistant",
          model: body.model,
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 10, output_tokens: 1 },
        },
      });
      if (!refuse) {
        send("content_block_start", { index: 0, content_block: { type: "text", text: "" } });
        for (const text of ["Copiii încep ", "de la 4 ani."]) {
          send("content_block_delta", { index: 0, delta: { type: "text_delta", text } });
        }
        send("content_block_stop", { index: 0 });
      }
      send("message_delta", {
        delta: { stop_reason: refuse ? "refusal" : "end_turn", stop_sequence: null },
        usage: { output_tokens: 5 },
      });
      send("message_stop", {});
      res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.ANTHROPIC_API_KEY = "test-key";
  await db.siteSettings.update({ where: { id: 1 }, data: { assistantEnabled: true } });
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await db.rateLimit.deleteMany({ where: { key: { startsWith: "assistant:" } } });
});

async function ask(content: string, origin = "http://localhost:3000") {
  const { POST } = await import("@/app/api/asistent/route");
  return POST(
    new Request("http://localhost:3000/api/asistent", {
      method: "POST",
      headers: { "content-type": "application/json", origin, host: "localhost:3000" },
      body: JSON.stringify({ locale: "ro", messages: [{ role: "user", content }] }),
    }),
  );
}

async function events(response: Response) {
  const text = await response.text();
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { type: string; text?: string; code?: string });
}

describe("the site's assistant", () => {
  it("streams the answer and sends the club's content with the rules", async () => {
    const response = await ask("De la ce vârstă?");
    expect(response.status).toBe(200);
    const received = await events(response);
    expect(
      received
        .filter((e) => e.type === "text")
        .map((e) => e.text)
        .join(""),
    ).toBe("Copiii încep de la 4 ani.");
    expect(received.at(-1)).toEqual({ type: "done" });

    const request = seen.at(-1)!;
    expect(request.body.model).toBe("claude-opus-5");
    expect(request.body.fallbacks).toBe("default");
    expect(request.headers["anthropic-beta"]).toBe("server-side-fallback-2026-07-01");
    expect(request.body.output_config).toEqual({ effort: "low" });
    const system = request.body.system as { text: string; cache_control: unknown }[];
    expect(system[0]?.cache_control).toEqual({ type: "ephemeral" });
    expect(system[0]?.text).toContain("Answer only from the club information");
    expect(system[0]?.text).toContain(
      "## Grupele clubului (minitenis, juniori și seniori) (/programe#grupe)",
    );
    expect(system[0]?.text).not.toContain("[DE COMPLETAT]");
  });

  it("reports a refusal instead of an empty answer", async () => {
    const received = await events(await ask("REFUZ"));
    expect(received).toContainEqual({ type: "error", code: "refused" });
  });

  it("refuses requests from other sites and stays off when switched off", async () => {
    expect((await ask("Salut", "https://evil.example")).status).toBe(403);
    await db.siteSettings.update({ where: { id: 1 }, data: { assistantEnabled: false } });
    try {
      expect((await ask("Salut")).status).toBe(404);
    } finally {
      await db.siteSettings.update({ where: { id: 1 }, data: { assistantEnabled: true } });
    }
  });
});
