"use client";

import { useState } from "react";
import { useFormAction } from "@/components/ui/useFormAction";
import type { FormState } from "@/lib/validation";

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  fields: Record<string, string>;
  label: string;
  /** Shown after success; uses the same verb as the button. */
  doneText?: string;
  variant?: "primary" | "secondary" | "danger";
  /** When set, a second click is needed and this sentence explains the consequence. */
  confirm?: string;
};

/** A single-purpose button backed by a server action (mark as read, archive, delete…). */
export function ActionButton({
  action,
  fields,
  label,
  doneText,
  variant = "secondary",
  confirm,
}: Props) {
  const { state, pending, formProps } = useFormAction(action);
  const [confirming, setConfirming] = useState(false);
  if (state.status === "success" && doneText) {
    return (
      <span role="status" className="text-note text-succes">
        {doneText}
      </span>
    );
  }
  const hidden = Object.entries(fields).map(([name, value]) => (
    <input key={name} type="hidden" name={name} value={value} />
  ));
  const button = (
    <button type="submit" className={`btn btn-${variant} btn-small`} disabled={pending}>
      {confirm ? `Da, ${label.charAt(0).toLowerCase()}${label.slice(1)}` : label}
    </button>
  );
  return (
    <span className="inline-grid gap-1">
      {confirm && !confirming ? (
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={() => setConfirming(true)}
        >
          {label}
        </button>
      ) : (
        <form {...formProps} className="flex flex-wrap items-center gap-2">
          {hidden}
          {confirm ? <span className="text-note">{confirm}</span> : null}
          {button}
          {confirm ? (
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => setConfirming(false)}
            >
              Renunț
            </button>
          ) : null}
        </form>
      )}
      {state.status === "error" ? (
        <span role="alert" className="field-error">
          {state.error}
        </span>
      ) : null}
    </span>
  );
}
