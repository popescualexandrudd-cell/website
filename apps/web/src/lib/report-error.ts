/**
 * Errors seen in the visitor's browser or on the website's server go to the club's own backend
 * (`POST /api/v1/client-errors`, ADR-0017), which logs them and passes them to the club's
 * GlitchTip: no third-party script in the page. Reporting never breaks the page.
 */
import { API_URL } from "./site";

export type ReportedError = { message?: string; digest?: string };

export function errorReport(where: string, error: ReportedError) {
  return {
    app: "web" as const,
    message: String(error.message || "error").slice(0, 500),
    where: where.slice(0, 300),
    digest: String(error.digest ?? "").slice(0, 64),
  };
}

export function reportError(where: string, error: ReportedError): void {
  try {
    void fetch(`${API_URL}/api/v1/client-errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(errorReport(where, error)),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // a report that cannot leave is dropped
  }
}
