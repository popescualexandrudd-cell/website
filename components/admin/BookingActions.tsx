"use client";

import { useFormAction } from "@/components/ui/useFormAction";
import { bookingTransitionAction } from "@/app/actions/admin-bookings";
import type { BookingStatus } from "@/lib/generated/prisma/browser";

const DONE_TEXT: Record<string, string> = {
  confirm: "Rezervarea e confirmată. Clientul primește emailul cu fișierul pentru calendar.",
  decline: "Rezervarea e refuzată. Clientul primește un email.",
  cancel: "Rezervarea e anulată. Clientul primește un email.",
  done: "Lecția e marcată ca efectuată.",
  noshow: "Lecția e marcată ca neprezentare.",
  reopen: "Lecția e din nou confirmată.",
};

/** One-tap actions on a booking; declining or cancelling asks for an optional reason first. */
export function BookingActions({
  id,
  status,
  compact = false,
}: {
  id: string;
  status: BookingStatus;
  compact?: boolean;
}) {
  const { state, pending, formProps: actionProps } = useFormAction(bookingTransitionAction);
  const small = compact ? "btn-small" : "";
  if (state.status === "success") {
    return (
      <p role="status" className="admin-ok">
        {DONE_TEXT[state.data?.action ?? ""] ?? "Salvat."}
      </p>
    );
  }
  const simple = (value: string, label: string, variant = "btn-secondary") => (
    <form {...actionProps}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={value} />
      <button type="submit" className={`btn ${variant} ${small}`} disabled={pending}>
        {label}
      </button>
    </form>
  );
  const withReason = (value: "decline" | "cancel", label: string) => (
    <details className="w-full">
      <summary className={`btn btn-secondary ${small} list-none`}>{label}</summary>
      <form {...actionProps} className="mt-3 grid gap-3">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="action" value={value} />
        <label className="field">
          <span className="field-label">Motivul (apare în emailul către client, opțional)</span>
          <textarea name="reason" rows={2} className="input" maxLength={500} />
        </label>
        <div>
          <button type="submit" className={`btn btn-danger ${small}`} disabled={pending}>
            {label}
          </button>
        </div>
      </form>
    </details>
  );
  return (
    <div className="grid gap-2">
      <div className="admin-row-actions">
        {status === "IN_ASTEPTARE" ? simple("confirm", "Confirmă rezervarea", "btn-primary") : null}
        {status === "CONFIRMATA" ? simple("done", "Marchează efectuată", "btn-primary") : null}
        {status === "CONFIRMATA" ? simple("noshow", "Neprezentare") : null}
        {status === "NEPREZENTARE" ? simple("done", "Marchează efectuată") : null}
        {status === "EFECTUATA" || status === "NEPREZENTARE"
          ? simple("reopen", "Readu la confirmată")
          : null}
        {status === "IN_ASTEPTARE" ? withReason("decline", "Refuză rezervarea") : null}
        {status === "CONFIRMATA" ? withReason("cancel", "Anulează rezervarea") : null}
      </div>
      {state.status === "error" ? (
        <p role="alert" className="booking-alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
