"use client";

import { useFormAction } from "@/components/ui/useFormAction";
import { loginAction } from "@/app/actions/admin-auth";

const MESSAGES: Record<string, string> = {
  invalid: "Emailul sau parola nu sunt corecte. Verifică și încearcă din nou.",
  locked: "Prea multe încercări greșite. Contul e blocat 15 minute; încearcă apoi din nou.",
  rateLimit: "Prea multe încercări de pe această conexiune. Așteaptă câteva minute.",
};

export function LoginForm({ next }: { next?: string }) {
  const { state, pending, formProps: actionProps } = useFormAction(loginAction);
  return (
    <form {...actionProps} className="grid gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="field">
        <label htmlFor="login-email" className="field-label">
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="input"
        />
      </div>
      <div className="field">
        <label htmlFor="login-password" className="field-label">
          Parola
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </div>
      {state.status === "error" ? (
        <p role="alert" className="booking-alert">
          {MESSAGES[state.error ?? "invalid"] ?? MESSAGES.invalid}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Se verifică…" : "Intră în cont"}
      </button>
    </form>
  );
}
