/** Any part of the page can open the assistant, optionally with a question to ask right away. */
export const ASSISTANT_OPEN_EVENT = "assistant-open";

export function openAssistant(question?: string): void {
  window.dispatchEvent(
    new CustomEvent<{ question?: string }>(ASSISTANT_OPEN_EVENT, { detail: { question } }),
  );
}
