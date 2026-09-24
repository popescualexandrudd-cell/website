"use client";

import { useFormAction } from "@/components/ui/useFormAction";
import { saveBookingNotes } from "@/app/actions/admin-bookings";

export function NotesForm({ id, notes }: { id: string; notes: string }) {
  const { state, pending, formProps: actionProps } = useFormAction(saveBookingNotes);
  return (
    <form {...actionProps} className="grid gap-3">
      <input type="hidden" name="id" value={id} />
      <label className="field">
        <span className="field-label">Note interne (le vezi doar tu)</span>
        <textarea
          name="internalNotes"
          rows={4}
          defaultValue={notes}
          className="input"
          maxLength={4000}
        />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-secondary btn-small" disabled={pending}>
          Salvează notele
        </button>
        {state.status === "success" ? (
          <span role="status" className="text-note text-succes">
            Notele sunt salvate.
          </span>
        ) : null}
      </div>
    </form>
  );
}
