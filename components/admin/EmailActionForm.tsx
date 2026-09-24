"use client";

import { useFormAction } from "@/components/ui/useFormAction";
import { emailTokenAction } from "@/app/actions/admin-bookings";

export function EmailActionForm({
  token,
  action,
}: {
  token: string;
  action: "confirm" | "decline";
}) {
  const { state, pending, formProps: submitProps } = useFormAction(emailTokenAction);
  if (state.status === "success") {
    return (
      <p role="status" className="admin-ok">
        {action === "confirm"
          ? "Rezervarea e confirmată. Clientul primește emailul cu fișierul pentru calendar."
          : "Rezervarea e refuzată. Clientul primește un email."}
      </p>
    );
  }
  return (
    <form {...submitProps} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      {action === "decline" ? (
        <label className="field">
          <span className="field-label">Motivul (apare în emailul către client, opțional)</span>
          <textarea name="reason" rows={3} className="input" maxLength={500} />
        </label>
      ) : null}
      {state.status === "error" ? (
        <p role="alert" className="booking-alert">
          {state.error}
        </p>
      ) : null}
      <div>
        <button
          type="submit"
          className={`btn ${action === "confirm" ? "btn-primary" : "btn-danger"}`}
          disabled={pending}
        >
          {action === "confirm" ? "Confirmă rezervarea" : "Refuză rezervarea"}
        </button>
      </div>
    </form>
  );
}
