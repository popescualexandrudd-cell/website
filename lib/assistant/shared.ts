/** What the assistant's API and the chat window share (no server code, no zod). */

/** Longest question a visitor can send, in characters. */
export const MAX_QUESTION_CHARS = 600;

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** What the API streams to the browser, one JSON object per line. */
export type AssistantEvent =
  | { type: "text"; text: string }
  | { type: "error"; code: "refused" | "busy" | "failed" }
  | { type: "done" };
