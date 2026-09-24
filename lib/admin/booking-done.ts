/** Confirmation after a booking action, shared by the action buttons and the list pages. */
export const BOOKING_DONE: Record<string, string> = {
  confirm: "Rezervarea e confirmată. Clientul primește emailul cu fișierul pentru calendar.",
  decline: "Rezervarea e refuzată. Clientul primește un email.",
  cancel: "Rezervarea e anulată. Clientul primește un email.",
  done: "Lecția e marcată ca efectuată.",
  noshow: "Lecția e marcată ca neprezentare.",
  reopen: "Lecția e din nou confirmată.",
};

/** The same messages, keyed as `?ok=rezervare-<action>` after a redirect back to a list. */
export const BOOKING_OK: Record<string, string> = Object.fromEntries(
  Object.entries(BOOKING_DONE).map(([action, text]) => [`rezervare-${action}`, text]),
);
