/**
 * The company details from the admin configuration (Q26, `GET /api/v1/config/company`), read on the
 * server and refreshed every 5 minutes: the footer and the event room's call button (Q34).
 */
import type { components } from "@jungle/api-client";
import { SERVER_API_URL } from "./site";

export type Company = components["schemas"]["CompanyOut"];

export async function companyDetails(fetchImpl: typeof fetch = fetch): Promise<Company | null> {
  try {
    const response = await fetchImpl(`${SERVER_API_URL}/api/v1/config/company`, { next: { revalidate: 300 } });
    return response.ok ? ((await response.json()) as Company) : null;
  } catch {
    return null;
  }
}

/** A `tel:` link for a phone number as it is written ("0722 000 000" → "tel:0722000000"), or null. */
export function telHref(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/[\s().-]+/g, "");
  return /^\+?\d{6,15}$/.test(digits) ? `tel:${digits}` : null;
}
