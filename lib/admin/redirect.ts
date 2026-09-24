import "server-only";
import { redirect } from "next/navigation";

/**
 * After an action that changes a list (the row may leave the current filter), go back to the
 * same list with `ok=<code>`, so the page can confirm what happened.
 */
export function backWith(formData: FormData, fallback: string, code: string): never {
  const raw = String(formData.get("back") ?? "");
  const base = raw.startsWith("/admin") && !raw.startsWith("//") ? raw : fallback;
  const url = new URL(base, "http://admin.local");
  url.searchParams.set("ok", code);
  redirect(`${url.pathname}${url.search}`);
}

/** Builds the `back` value from the page's own search params (without a previous `ok`). */
export function currentPath(
  pathname: string,
  params: Record<string, string | string[] | undefined>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (key !== "ok" && typeof value === "string") query.set(key, value);
  const text = query.toString();
  return text ? `${pathname}?${text}` : pathname;
}
