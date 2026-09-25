import type { LocalizedSettings } from "./content";

/** Fills the {{…}} placeholders of the legal drafts with the current settings. */
export function fillLegalTemplate(
  body: string,
  settings: LocalizedSettings,
  version: string,
  locale: string,
  retentionMonths: number,
): string {
  const bookingMode =
    settings.bookingMode === "INSTANT"
      ? locale === "en"
        ? "It is confirmed automatically."
        : "Se confirmă automat."
      : locale === "en"
        ? "We confirm it by email, usually the same day."
        : "O confirmăm pe email, de obicei în aceeași zi.";
  const values: Record<string, string> = {
    "entitate.denumire": settings.legalName,
    "entitate.forma": settings.legalForm,
    "entitate.cui": settings.legalCui,
    "entitate.sediu": settings.legalAddress,
    "contact.email": settings.email,
    "contact.telefon": settings.phone,
    "retentie.luni": String(retentionMonths),
    "anulare.ore": String(settings.freeCancelHours),
    "plata.metode": settings.paymentMethods.join(", ").toLowerCase(),
    "rezervare.mod": bookingMode,
    versiune: version,
  };
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) => values[key] ?? match);
}
