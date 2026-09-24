"use client";

import { changePasswordAction } from "@/app/actions/admin-auth";
import {
  createUserAction,
  logoutEverywhereAction,
  resetUserPasswordAction,
  sendTestEmailAction,
} from "@/app/actions/admin-settings";
import { useFormAction } from "@/components/ui/useFormAction";

function Field(props: {
  name: string;
  label: string;
  type?: string;
  error?: string;
  autoComplete?: string;
  defaultValue?: string;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{props.label}</span>
      <input
        type={props.type ?? "text"}
        name={props.name}
        className="input"
        autoComplete={props.autoComplete}
        defaultValue={props.defaultValue}
        aria-invalid={props.error ? true : undefined}
      />
      {props.hint ? <span className="field-hint">{props.hint}</span> : null}
      {props.error ? <span className="field-error">{props.error}</span> : null}
    </label>
  );
}

export function ChangePasswordForm() {
  const { state, pending, formProps } = useFormAction(changePasswordAction);
  const err = (n: string) => (state.status === "error" ? state.fieldErrors?.[n] : undefined);
  return (
    <form {...formProps} className="admin-form max-w-md" noValidate>
      <Field
        name="current"
        label="Parola actuală"
        type="password"
        autoComplete="current-password"
        error={err("current")}
      />
      <Field
        name="next"
        label="Parola nouă"
        type="password"
        autoComplete="new-password"
        error={err("next")}
        hint="Cel puțin 12 caractere, nu doar litere sau doar cifre. O frază lungă e ușor de ținut minte."
      />
      <Field
        name="repeat"
        label="Repetă parola nouă"
        type="password"
        autoComplete="new-password"
        error={err("repeat")}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          Schimbă parola
        </button>
        {state.status === "success" ? (
          <span role="status" className="text-succes">
            Parola e schimbată. Celelalte dispozitive au fost deconectate.
          </span>
        ) : null}
      </div>
    </form>
  );
}

export function LogoutEverywhereForm() {
  const { state, pending, formProps } = useFormAction(logoutEverywhereAction);
  return (
    <form {...formProps} className="flex flex-wrap items-center gap-3">
      <button type="submit" className="btn btn-secondary" disabled={pending}>
        Deconectează celelalte dispozitive
      </button>
      {state.status === "success" ? (
        <span role="status" className="text-succes">
          Am deconectat {state.data?.count ?? "0"}{" "}
          {state.data?.count === "1" ? "dispozitiv" : "dispozitive"}.
        </span>
      ) : null}
    </form>
  );
}

export function TestEmailForm({ defaultTo }: { defaultTo: string }) {
  const { state, pending, formProps } = useFormAction(sendTestEmailAction);
  return (
    <form {...formProps} className="flex flex-wrap items-end gap-3" noValidate>
      <label className="field min-w-64 flex-1">
        <span className="field-label">Trimite la adresa</span>
        <input
          type="email"
          name="to"
          defaultValue={defaultTo}
          className="input"
          autoComplete="email"
        />
      </label>
      <button type="submit" className="btn btn-secondary" disabled={pending}>
        {pending ? "Se trimite…" : "Trimite un email de test"}
      </button>
      {state.status === "success" ? (
        <p role="status" className="w-full text-succes">
          Emailul de test a fost trimis la {state.data?.to}. Verifică și dosarul Spam.
        </p>
      ) : null}
      {state.status === "error" ? (
        <p role="alert" className="field-error w-full">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function CreateUserForm() {
  const { state, pending, formProps } = useFormAction(createUserAction);
  const err = (n: string) => (state.status === "error" ? state.fieldErrors?.[n] : undefined);
  if (state.status === "success") {
    return (
      <p role="status" className="admin-ok">
        Contul e creat. Trimite persoanei adresa panoului (/admin) și parola, pe un canal sigur; o
        poate schimba din „Contul meu”.
      </p>
    );
  }
  return (
    <form {...formProps} className="admin-form" noValidate>
      <fieldset>
        <legend>Cont nou</legend>
        <div className="admin-grid-2">
          <Field name="name" label="Nume" error={err("name")} />
          <Field name="email" label="Email" type="email" error={err("email")} />
          <label className="field">
            <span className="field-label">Rol</span>
            <select name="role" className="input" defaultValue="EDITOR">
              <option value="EDITOR">Editor: doar conținut și imagini</option>
              <option value="PROPRIETAR">Proprietar: acces complet</option>
            </select>
          </label>
          <Field
            name="password"
            label="Parola inițială"
            type="text"
            autoComplete="off"
            error={err("password")}
            hint="Cel puțin 12 caractere."
          />
        </div>
      </fieldset>
      <div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          Creează contul
        </button>
      </div>
    </form>
  );
}

export function ResetPasswordForm({ id }: { id: string }) {
  const { state, pending, formProps } = useFormAction(resetUserPasswordAction);
  if (state.status === "success") {
    return (
      <span role="status" className="text-note text-succes">
        Parola e resetată; contul a fost deconectat peste tot.
      </span>
    );
  }
  return (
    <details>
      <summary className="btn btn-secondary btn-small list-none">Resetează parola</summary>
      <form {...formProps} className="mt-2 flex flex-wrap items-end gap-2" noValidate>
        <input type="hidden" name="id" value={id} />
        <label className="field">
          <span className="text-note">Parola nouă (cel puțin 12 caractere)</span>
          <input type="text" name="password" autoComplete="off" className="input" />
        </label>
        <button type="submit" className="btn btn-secondary btn-small" disabled={pending}>
          Resetează parola
        </button>
        {state.status === "error" ? (
          <span role="alert" className="field-error w-full">
            {state.error}
          </span>
        ) : null}
      </form>
    </details>
  );
}
