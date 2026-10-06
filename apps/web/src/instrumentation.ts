/**
 * The website's server errors (a page that failed while rendering) go to the club's backend, like
 * the browser's (ADR-0017). Next.js calls `onRequestError` for every such error.
 */
export async function onRequestError(error: unknown, request: { path: string }) {
  const { reportError } = await import("./lib/report-error");
  const found = (error ?? {}) as { message?: string; digest?: string };
  reportError(`server ${request.path}`, { message: found.message, digest: found.digest });
}
