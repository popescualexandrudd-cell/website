/**
 * Staff login (ADR-0011): email and password, then the code from the authenticator app. A staff
 * member without two-factor authentication sets it up here first (the secret to type into the
 * app, then a code), and sees the recovery codes once. The panel opens only after that.
 */
import { type FormEvent, useState } from "react";
import { type AdminApi, ApiError, Offline } from "./api";
import { errorText, type Lang, t } from "./i18n";

type Step = "credentials" | "code" | "setup" | "recovery";

export function Login({ api, lang, onDone }: { api: AdminApi; lang: Lang; onDone: () => void }) {
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [recovery, setRecovery] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const explain = (failure: unknown) => {
    if (failure instanceof ApiError) setError(errorText(lang, failure.code, failure.params));
    else if (failure instanceof Offline) setError(t(lang, "offline"));
    else setError(t(lang, "errors.generic"));
  };

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === "auth.mfa_code_required") {
        setStep("code");
      } else {
        explain(failure);
      }
    } finally {
      setBusy(false);
    }
  };

  const signIn = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await api.csrf();
      const result = await api.login(email.trim(), password, step === "code" ? code.trim() : null);
      if (result.mfa_setup_required) {
        const setup = await api.mfaSetup();
        setSecret(setup.secret);
        setUri(setup.otpauth_uri);
        setCode("");
        setStep("setup");
        return;
      }
      onDone();
    });
  };

  const confirm = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const codes = await api.mfaConfirm(code.trim());
      setRecovery(codes.recovery_codes);
      setStep("recovery");
    });
  };

  return (
    <main className="login" lang={lang}>
      <section className="login__card panel" aria-labelledby="login-title">
        <h1 id="login-title">{t(lang, "login.title")}</h1>
        {error ? (
          <p className="banner banner--error" role="alert">
            {error}
          </p>
        ) : null}
        {step === "credentials" || step === "code" ? (
          <form onSubmit={signIn} className="form">
            <label>
              {t(lang, "login.email")}
              <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              {t(lang, "login.password")}
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {step === "code" ? (
              <label>
                {t(lang, "login.code")}
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </label>
            ) : null}
            <button type="submit" className="button button--primary" disabled={busy}>
              {t(lang, "login.submit")}
            </button>
          </form>
        ) : null}
        {step === "setup" ? (
          <form onSubmit={confirm} className="form">
            <p>{t(lang, "login.setupIntro")}</p>
            <p className="secret" aria-label={t(lang, "login.secret")}>
              {secret}
            </p>
            <p className="muted">
              <a href={uri}>{t(lang, "login.openApp")}</a>
            </p>
            <label>
              {t(lang, "login.code")}
              <input inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} />
            </label>
            <button type="submit" className="button button--primary" disabled={busy}>
              {t(lang, "login.confirm")}
            </button>
          </form>
        ) : null}
        {step === "recovery" ? (
          <div className="form">
            <p>{t(lang, "login.recoveryIntro")}</p>
            <ul className="recovery" aria-label={t(lang, "login.recovery")}>
              {recovery.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <button type="button" className="button button--primary" onClick={onDone}>
              {t(lang, "login.saved")}
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
