"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { idleState, type FormState } from "@/lib/validation";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

/**
 * useActionState without React's automatic form reset: when validation fails, what the
 * person typed stays in the fields. Without JavaScript the form still posts natively.
 */
export function useFormAction(action: Action, initial: FormState = idleState) {
  const [state, formAction, pending] = useActionState(action, initial);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(
      event.currentTarget,
      submitter instanceof HTMLElement ? submitter : null,
    );
    startTransition(() => formAction(data));
  };
  return { state, pending, formProps: { action: formAction, onSubmit } };
}
