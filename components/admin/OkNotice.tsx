/** Confirmation shown after a list action redirected back with `?ok=<code>`. */
export function OkNotice({ code, messages }: { code: unknown; messages: Record<string, string> }) {
  const text = typeof code === "string" ? messages[code] : undefined;
  return text ? (
    <p role="status" className="admin-ok mb-4">
      {text}
    </p>
  ) : null;
}
