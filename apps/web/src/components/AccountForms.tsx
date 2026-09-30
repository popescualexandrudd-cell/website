"use client";

/**
 * The account's forms (§9.3): creating an account (R-001: name, email, phone, date of birth,
 * password; the Terms and the Privacy policy accepted in their current versions, §12.3), confirming
 * the email, asking for a new password and setting it. Only the data the club needs; the server
 * checks everything (the minimum age, Q43; the password; the documents' versions).
 */
import { useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import * as account from "@/lib/account";
import { useErrorText } from "./useErrorText";

export type LegalVersion = { kind: "terms" | "privacy"; version: number; language: "ro" | "en" };

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && (
        <span className="field__hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
    </div>
  );
}

export function RegisterForm({ locale, documents }: { locale: "ro" | "en"; documents: LegalVersion[] | null }) {
  const t = useTranslations("web.account.register");
  const errorText = useErrorText();
  const [data, setData] = useState({ first_name: "", last_name: "", email: "", phone: "", date_of_birth: "", password: "" });
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const set = (key: keyof typeof data) => (e: { target: { value: string } }) => setData({ ...data, [key]: e.target.value });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!documents) return;
    setBusy(true);
    setError("");
    const answer = await account.register({
      ...data,
      email: data.email.trim(),
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      phone: data.phone.trim(),
      preferred_language: locale,
      accepted_documents: documents,
    });
    setBusy(false);
    if (answer.ok) return setDone(answer.data.email ?? data.email);
    setError(errorText(answer.code, answer.params));
  };

  if (done)
    return (
      <div className="form-panel account__panel" role="status">
        <h2 className="h3">{t("doneTitle")}</h2>
        <p>{t("done", { email: done })}</p>
        <Link className="btn btn-primary" href="/account">
          {t("toAccount")}
        </Link>
      </div>
    );

  return (
    <form className="form form-panel account__panel" onSubmit={(event) => void submit(event)}>
      <div className="account__row">
        <Field id="reg-first" label={t("firstName")}>
          <input id="reg-first" className="input" autoComplete="given-name" required maxLength={150} value={data.first_name} onChange={set("first_name")} />
        </Field>
        <Field id="reg-last" label={t("lastName")}>
          <input id="reg-last" className="input" autoComplete="family-name" required maxLength={150} value={data.last_name} onChange={set("last_name")} />
        </Field>
      </div>
      <Field id="reg-email" label={t("email")}>
        <input id="reg-email" className="input" type="email" autoComplete="email" required maxLength={254} value={data.email} onChange={set("email")} />
      </Field>
      <Field id="reg-phone" label={t("phone")} hint={t("phoneHint")}>
        <input
          id="reg-phone"
          className="input"
          type="tel"
          autoComplete="tel"
          required
          minLength={4}
          maxLength={30}
          aria-describedby="reg-phone-hint"
          value={data.phone}
          onChange={set("phone")}
        />
      </Field>
      <Field id="reg-birth" label={t("birth")} hint={t("birthHint")}>
        <input
          id="reg-birth"
          className="input"
          type="date"
          autoComplete="bday"
          required
          aria-describedby="reg-birth-hint"
          value={data.date_of_birth}
          onChange={set("date_of_birth")}
        />
      </Field>
      <Field id="reg-password" label={t("password")} hint={t("passwordHint")}>
        <input
          id="reg-password"
          className="input"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={128}
          aria-describedby="reg-password-hint"
          value={data.password}
          onChange={set("password")}
        />
      </Field>
      <label className="consent">
        <input type="checkbox" required checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        <span>
          {t.rich("accept", {
            terms: (chunks) => (
              <Link href="/terms" target="_blank">
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/privacy" target="_blank">
                {chunks}
              </Link>
            ),
          })}
        </span>
      </label>
      {documents === null && (
        <p className="status" data-kind="error" role="alert">
          {t("documentsMissing")}
        </p>
      )}
      {error && (
        <p className="status" data-kind="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={busy || documents === null || !accepted}>
        {busy ? t("working") : t("submit")}
      </button>
      <p className="account__links">
        <Link href="/account">{t("haveAccount")}</Link>
      </p>
    </form>
  );
}

/** The link from the confirmation email: confirms at once (a link scanner only confirms an address). */
export function VerifyEmail({ token }: { token: string | null }) {
  const t = useTranslations("web.account.verify");
  const errorText = useErrorText();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(token ? null : { ok: false, text: t("missing") });
  const started = useRef(false);
  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    void account.verifyEmail(token).then((answer) => setMessage(answer.ok ? { ok: true, text: t("done") } : { ok: false, text: errorText(answer.code) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  return (
    <div className="panel" aria-live="polite">
      <h1 className="h2">{t("title")}</h1>
      {message === null ? (
        <p className="status">{t("working")}</p>
      ) : (
        <p className="status" data-kind={message.ok ? "ok" : "error"}>
          {message.text}
        </p>
      )}
      <Link className="btn btn-secondary" href="/account">
        {t("toAccount")}
      </Link>
    </div>
  );
}

/** Asking for a new password: the answer is the same whether the address has an account or not. */
export function ForgotPassword() {
  const t = useTranslations("web.account.forgot");
  const errorText = useErrorText();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("busy");
    setError("");
    const answer = await account.requestReset(email.trim());
    if (answer.ok) return setState("sent");
    setState("idle");
    setError(errorText(answer.code, answer.params));
  };
  return (
    <div className="panel">
      <h1 className="h2">{t("title")}</h1>
      {state === "sent" ? (
        <p className="status" data-kind="ok" role="status">
          {t("sent")}
        </p>
      ) : (
        <form className="form" onSubmit={(event) => void submit(event)}>
          <p className="lead">{t("lead")}</p>
          <Field id="forgot-email" label={t("email")}>
            <input id="forgot-email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {error && (
            <p className="status" data-kind="error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={state === "busy"}>
            {t("submit")}
          </button>
        </form>
      )}
      <p className="account__links">
        <Link href="/account">{t("toAccount")}</Link>
      </p>
    </div>
  );
}

/** The link from the password email: a new password for that account. */
export function NewPassword({ uid, token }: { uid: string | null; token: string | null }) {
  const t = useTranslations("web.account.newPassword");
  const errorText = useErrorText();
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState(uid && token ? "" : t("missing"));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!uid || !token) return;
    setState("busy");
    setError("");
    const answer = await account.confirmReset(uid, token, password);
    if (answer.ok) return setState("done");
    setState("idle");
    setError(errorText(answer.code, answer.params));
  };
  return (
    <div className="panel">
      <h1 className="h2">{t("title")}</h1>
      {state === "done" ? (
        <p className="status" data-kind="ok" role="status">
          {t("done")}
        </p>
      ) : (
        <form className="form" onSubmit={(event) => void submit(event)}>
          <Field id="new-password" label={t("password")} hint={t("hint")}>
            <input
              id="new-password"
              className="input"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              maxLength={128}
              aria-describedby="new-password-hint"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && (
            <p className="status" data-kind="error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={state === "busy" || !uid || !token}>
            {t("submit")}
          </button>
        </form>
      )}
      <p className="account__links">
        <Link href="/account">{t("toAccount")}</Link>
      </p>
    </div>
  );
}
