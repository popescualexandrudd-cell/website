/**
 * How the kiosk screens read the API's answers (ADR-0012). Every call carries the device
 * token (no cookies). A network failure or a server error becomes `Offline` (the screen shows
 * "temporarily unavailable" and retries); any other refusal becomes `ApiError` with the stable
 * code, translated on screen.
 */

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly params: Record<string, unknown>,
    readonly status: number,
  ) {
    super(code);
  }
}

export class Offline extends Error {}

type ErrorBody = { error?: { code?: string; params?: Record<string, unknown> } };
type Result<T> = { data?: T; error?: unknown; response: Response };

export async function unwrap<T>(call: Promise<Result<T>>): Promise<T> {
  let result: Result<T>;
  try {
    result = await call;
  } catch {
    throw new Offline("network");
  }
  const { response } = result;
  if (response.status >= 500) throw new Offline(`status ${response.status}`);
  if (!response.ok) {
    const body = result.error as ErrorBody | undefined;
    throw new ApiError(body?.error?.code ?? "unknown", body?.error?.params ?? {}, response.status);
  }
  return result.data as T;
}

/** The API root is configured as …/api/v1; the schema's paths already start with /api/v1. */
export function apiOrigin(apiUrl: string): string {
  return apiUrl.replace(/\/+$/, "").replace(/\/api\/v1$/, "");
}

/** The headers every device call carries. */
export function deviceHeaders(deviceToken: string): Record<string, string> {
  return { "X-Device-Token": deviceToken };
}
