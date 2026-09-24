"use client";

import { activatePackageAction, saveClientAction } from "@/app/actions/admin-clients";
import { useFormAction } from "@/components/ui/useFormAction";

type ClientValues = {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  sessionsRemaining: string;
  packageValidUntil: string;
};

export function ClientForm({ client }: { client: ClientValues }) {
  const { state, pending, formProps } = useFormAction(saveClientAction);
  const err = (name: string) => (state.status === "error" ? state.fieldErrors?.[name] : undefined);
  const field = (name: keyof ClientValues, label: string, type = "text") => (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={client[name]}
        className="input"
        aria-invalid={err(name) ? true : undefined}
      />
      {err(name) ? <span className="field-error">{err(name)}</span> : null}
    </label>
  );
  return (
    <form {...formProps} className="admin-form" noValidate>
      <input type="hidden" name="id" value={client.id} />
      <fieldset>
        <legend>Date de contact</legend>
        <div className="admin-grid-2">
          {field("name", "Nume")}
          {field("phone", "Telefon", "tel")}
          {field("email", "Email", "email")}
        </div>
      </fieldset>
      <fieldset>
        <legend>Pachet</legend>
        <div className="admin-grid-2">
          {field("sessionsRemaining", "Lecții rămase în pachet", "number")}
          {field("packageValidUntil", "Pachet valabil până la", "date")}
        </div>
        <p className="field-hint">
          Lecțiile rămase scad automat cu una când marchezi o lecție „efectuată”.
        </p>
      </fieldset>
      <fieldset>
        <legend>Note interne</legend>
        <label className="field">
          <span className="field-label">Note (le vezi doar tu)</span>
          <textarea
            name="notes"
            rows={4}
            defaultValue={client.notes}
            className="input"
            maxLength={4000}
          />
        </label>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          Salvează modificările
        </button>
        {state.status === "success" ? (
          <span role="status" className="text-succes">
            Modificările sunt salvate.
          </span>
        ) : null}
        {state.status === "error" && state.error ? (
          <span role="alert" className="field-error">
            {state.error}
          </span>
        ) : null}
      </div>
    </form>
  );
}

export function PackageForm({ id, plans }: { id: string; plans: { id: string; label: string }[] }) {
  const { state, pending, formProps } = useFormAction(activatePackageAction);
  if (plans.length === 0)
    return (
      <p className="text-note text-cerneala-2">
        Nu ai definit pachete. Le adaugi în Conținut → Prețuri și pachete.
      </p>
    );
  return (
    <form {...formProps} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="id" value={id} />
      <label className="field min-w-64">
        <span className="field-label">Pachet vândut</span>
        <select name="planId" className="input" defaultValue="">
          <option value="" disabled>
            Alege pachetul…
          </option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn btn-secondary" disabled={pending}>
        Activează pachetul
      </button>
      {state.status === "success" ? (
        <span role="status" className="text-succes">
          Pachetul e activat.
        </span>
      ) : null}
      {state.status === "error" ? (
        <span role="alert" className="field-error">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
