import Anthropic from "@anthropic-ai/sdk";
import { getSettings } from "@/lib/content";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, isSameOrigin } from "@/lib/request";
import { assistantAvailable, loadClubKnowledge } from "@/lib/assistant/load";
import { assistantInstructions, parseAssistantRequest } from "@/lib/assistant/prompt";
import type { AssistantEvent } from "@/lib/assistant/shared";

export const dynamic = "force-dynamic";

const DEFAULT_MODEL = "claude-opus-5";

let client: Anthropic | undefined;
function anthropic(): Anthropic {
  // Reads ANTHROPIC_API_KEY. A visitor waits for the answer, so no long retries.
  client ??= new Anthropic({ timeout: 60_000, maxRetries: 1 });
  return client;
}

function fail(error: "forbidden" | "invalid" | "unavailable" | "busy", status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * The site's assistant: answers a visitor's question from the club's published content only,
 * streamed as it is written. Nothing is stored; the conversation lives in the visitor's browser.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("forbidden", 403);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("invalid", 400);
  }
  const input = parseAssistantRequest(body);
  if (!input) return fail("invalid", 400);
  if (!assistantAvailable(await getSettings())) return fail("unavailable", 404);

  // Per visitor and for the whole site, so a script cannot run up the bill.
  const ip = await getClientIp();
  const dailyLimit = Number(process.env.ASSISTANT_DAILY_LIMIT) || 400;
  const allowed =
    (await rateLimit(`assistant:ip:${ip}`, 12, 10 * 60)) &&
    (await rateLimit(`assistant:ip-day:${ip}`, 60, 24 * 60 * 60)) &&
    (await rateLimit("assistant:site-day", dailyLimit, 24 * 60 * 60));
  if (!allowed) return fail("busy", 429);

  const knowledge = await loadClubKnowledge(input.locale);
  const instructions = assistantInstructions({
    clubName: knowledge.settings.brandName,
    locale: input.locale,
    evaluationPath: knowledge.paths.evaluation,
    bookingPath: knowledge.paths.booking,
    contactPath: knowledge.paths.contact,
  });

  const model = process.env.ASSISTANT_MODEL || DEFAULT_MODEL;
  // Models whose safety classifiers can decline a request; a decline is retried server-side on
  // Anthropic's recommended fallback model instead of reaching the visitor as a refusal.
  const withFallbacks = /^claude-(opus|fable)-5/.test(model);
  const stream = anthropic().beta.messages.stream(
    {
      model,
      max_tokens: 2000,
      output_config: { effort: "low" },
      system: [
        {
          type: "text",
          text: `${instructions}\n\n<club_information>\n${knowledge.text}\n</club_information>`,
          // The club's content is the same for every question until someone edits it.
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: input.messages,
      ...(withFallbacks
        ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
        : {}),
    },
    { signal: request.signal },
  );

  const encoder = new TextEncoder();
  let closed = false;
  const events = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AssistantEvent) => {
        if (!closed) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            send({ type: "text", text: event.delta.text });
          }
        }
        const message = await stream.finalMessage();
        if (message.stop_reason === "refusal") send({ type: "error", code: "refused" });
        else if (message.stop_reason === "max_tokens") send({ type: "text", text: "…" });
        send({ type: "done" });
        console.info(
          `[asistent] ${message.model}: ${message.usage.input_tokens} in (+${message.usage.cache_read_input_tokens ?? 0} cache), ${message.usage.output_tokens} out`,
        );
      } catch (error) {
        if (!request.signal.aborted) {
          console.error("[asistent]", error instanceof Error ? error.message : error);
          send({
            type: "error",
            code:
              error instanceof Anthropic.RateLimitError ||
              (error instanceof Anthropic.APIError && error.status === 529)
                ? "busy"
                : "failed",
          });
        }
      } finally {
        if (!closed) controller.close();
        closed = true;
      }
    },
    // The visitor closed the window or asked another question: stop the answer, and its cost.
    cancel() {
      closed = true;
      stream.abort();
    },
  });

  return new Response(events, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
