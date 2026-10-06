/**
 * A club device's unexpected errors go to the backend (`POST /api/v1/client-errors`, ADR-0017),
 * which logs them and passes them to the club's GlitchTip. At most one report per message every
 * minute, so a looping error does not flood the backend; reporting never breaks the screen.
 */
export type ClientApp = "admin" | "kiosk-league" | "kiosk-payments" | "court-screens" | "cafe-display";

export function watchErrors(app: ClientApp, endpoint: string, target: Window = window): () => void {
  const lastSent = new Map<string, number>();
  const send = (message: string) => {
    const now = Date.now();
    if (now - (lastSent.get(message) ?? -Infinity) < 60_000) return;
    lastSent.set(message, now);
    try {
      void fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app, message: message.slice(0, 500), where: target.location.pathname.slice(0, 300) }),
        keepalive: true,
      }).catch(() => undefined);
    } catch {
      // dropped
    }
  };
  const onError = (event: ErrorEvent) => send(event.message || "error");
  const onRejection = (event: PromiseRejectionEvent) =>
    send(event.reason instanceof Error ? event.reason.message : String(event.reason ?? "rejection"));
  target.addEventListener("error", onError);
  target.addEventListener("unhandledrejection", onRejection);
  return () => {
    target.removeEventListener("error", onError);
    target.removeEventListener("unhandledrejection", onRejection);
  };
}
