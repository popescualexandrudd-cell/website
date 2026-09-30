"use client";

/**
 * The account (§9.3 `/cont`): signing in, then the visitor's own page (profile, email
 * confirmation, bookings and classes, signing out). Everything is read and decided by the server
 * with the session cookie (ADR-0011); the page shows only this visitor's data.
 */
import { useFormatter, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import * as account from "@/lib/account";
import { CLUB_TZ } from "@/lib/live";
import { lei } from "@/lib/packages";
import { useErrorText } from "./useErrorText";

type State = { kind: "loading" } | { kind: "anonymous" } | { kind: "offline" } | { kind: "user"; me: account.Me };

export function AccountArea({ locale }: { locale: string }) {
  const t = useTranslations("web.account");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    void account.session().then((answer) => {
      if (!alive) return;
      if (!answer.ok) setState({ kind: "offline" });
      else if (answer.data.authenticated && answer.data.user) setState({ kind: "user", me: answer.data.user });
      else setState({ kind: "anonymous" });
    });
    return () => {
      alive = false;
    };
  }, []);

  if (state.kind === "loading") return <p className="status" aria-live="polite">{t("loading")}</p>;
  if (state.kind === "offline")
    return (
      <p className="status" data-kind="error" role="alert">
        {t("offline")}
      </p>
    );
  if (state.kind === "anonymous") return <LoginForm onSignedIn={(me) => setState({ kind: "user", me })} />;
  return <Dashboard me={state.me} locale={locale} onSignedOut={() => setState({ kind: "anonymous" })} />;
}

function LoginForm({ onSignedIn }: { onSignedIn: (me: account.Me) => void }) {
  const t = useTranslations("web.account.login");
  const errorText = useErrorText();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const answer = await account.login(email.trim(), password, otp);
    setBusy(false);
    if (answer.ok) return onSignedIn(answer.data.user);
    // A second factor, when the account has one (R-004): ask for the code, keep the rest.
    if (answer.code === "auth.mfa_code_required" && otp === null) return setOtp("");
    setError(errorText(answer.code, answer.params));
  };

  return (
    <div className="form-panel account__panel">
      <h2 className="h3">{t("title")}</h2>
      <form className="form" onSubmit={(event) => void submit(event)} noValidate={false}>
        <div className="field">
          <label htmlFor="login-email">{t("email")}</label>
          <input id="login-email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="login-password">{t("password")}</label>
          <input
            id="login-password"
            className="input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {otp !== null && (
          <div className="field">
            <label htmlFor="login-otp">{t("otp")}</label>
            <input
              id="login-otp"
              className="input"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>
        )}
        {error && (
          <p className="status" data-kind="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? t("working") : t("submit")}
        </button>
      </form>
      <p className="account__links">
        <Link href="/account/forgot-password">{t("forgot")}</Link>
        <Link href="/account/register">{t("register")}</Link>
      </p>
    </div>
  );
}

function Dashboard({ me, locale, onSignedOut }: { me: account.Me; locale: string; onSignedOut: () => void }) {
  const t = useTranslations("web.account.dashboard");
  const format = useFormatter();
  const errorText = useErrorText();
  const [bookings, setBookings] = useState<account.Booking[] | null>(null);
  const [classes, setClasses] = useState<account.Enrollment[] | null>(null);
  const [loadError, setLoadError] = useState<{ code: string | null } | null>(null);
  const [notice, setNotice] = useState("");
  const [asking, setAsking] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    void Promise.all([account.myBookings(), account.myClasses()]).then(([b, c]) => {
      if (!alive) return;
      setBookings(b.ok ? b.data : []);
      setClasses(c.ok ? c.data : []);
      setLoadError(!b.ok ? { code: b.code } : !c.ok ? { code: c.code } : null);
    });
    return () => {
      alive = false;
    };
  }, [version]);

  const when = (iso: string) =>
    format.dateTime(new Date(iso), { timeZone: CLUB_TZ, weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

  const cancel = async (id: string) => {
    setAsking(null);
    const answer = await account.cancelBooking(id);
    if (!answer.ok) return setNotice(errorText(answer.code, answer.params));
    // R-070: 24 hours or more before, nothing to pay; a session is made up, a rental becomes credit.
    setNotice(t(answer.data.cancellation_outcome === "charged" ? "cancelledCharged" : "cancelledFree"));
    setVersion((v) => v + 1);
  };

  const signOut = async () => {
    await account.logout();
    onSignedOut();
  };

  const sorted = bookings ? account.sortBookings(bookings, new Date()) : null;
  return (
    <div className="account">
      <section className="account__card" aria-labelledby="account-me">
        <h2 id="account-me" className="h3">
          {t("hello", { name: me.first_name })}
        </h2>
        <dl className="account__profile">
          <div>
            <dt>{t("name")}</dt>
            <dd>
              {me.first_name} {me.last_name}
            </dd>
          </div>
          <div>
            <dt>{t("email")}</dt>
            <dd>{me.email ?? "–"}</dd>
          </div>
          <div>
            <dt>{t("phone")}</dt>
            <dd>{me.phone}</dd>
          </div>
        </dl>
        {!me.email_verified && (
          <div className="account__alert" role="status">
            <p>{t("verifyFirst")}</p>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={resent}
              onClick={() =>
                void account.resendVerification().then((a) => (a.ok ? setResent(true) : setNotice(errorText(a.code, a.params))))
              }
            >
              {resent ? t("resent") : t("resend")}
            </button>
          </div>
        )}
        <p className="account__actions">
          <Link className="btn btn-primary" href="/bookings">
            {t("book")}
          </Link>
          <button type="button" className="btn btn-secondary" onClick={() => void signOut()}>
            {t("signOut")}
          </button>
        </p>
      </section>

      {(notice || loadError) && (
        <p className="status" role="status">
          {notice || errorText(loadError?.code ?? null)}
        </p>
      )}

      <section className="account__card" aria-labelledby="account-bookings" aria-busy={bookings === null}>
        <h2 id="account-bookings" className="h3">
          {t("bookings")}
        </h2>
        {sorted === null ? (
          <p className="league__text">{t("loading")}</p>
        ) : sorted.upcoming.length === 0 ? (
          <p className="league__text">{t("noBookings")}</p>
        ) : (
          <ul className="account__list">
            {sorted.upcoming.map((b) => (
              <li key={b.id}>
                <div>
                  <strong>{when(b.starts_at)}</strong>
                  <span>
                    {b.resource_name} · {t(`types.${TYPES.includes(b.session_type) ? b.session_type : "other"}`)}
                    {b.price_total > 0 &&
                      ` · ${t(b.price_provisional ? "priceProvisional" : "price", { amount: lei(b.price_total, locale) })}`}
                  </span>
                </div>
                {asking === b.id ? (
                  <span className="account__confirm">
                    <span>{t("cancelAsk")}</span>
                    <button type="button" className="btn btn-secondary" onClick={() => void cancel(b.id)}>
                      {t("cancelYes")}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setAsking(null)}>
                      {t("cancelNo")}
                    </button>
                  </span>
                ) : (
                  <button type="button" className="btn btn-secondary" onClick={() => setAsking(b.id)}>
                    {t("cancel")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="events__note">{t("cancelRule")}</p>
      </section>

      <section className="account__card" aria-labelledby="account-classes" aria-busy={classes === null}>
        <h2 id="account-classes" className="h3">
          {t("classes")}
        </h2>
        {classes === null ? (
          <p className="league__text">{t("loading")}</p>
        ) : classes.filter((c) => new Date(c.starts_at) > new Date() && c.status !== "cancelled").length === 0 ? (
          <p className="league__text">{t("noClasses")}</p>
        ) : (
          <ul className="account__list">
            {classes
              .filter((c) => new Date(c.starts_at) > new Date() && c.status !== "cancelled")
              .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
              .map((c) => (
                <li key={c.id}>
                  <div>
                    <strong>{when(c.starts_at)}</strong>
                    <span>{t(c.status === "waitlisted" ? "classWaiting" : "classBooked")}</span>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>
      <p className="events__note">{t("more")}</p>
    </div>
  );
}

const TYPES = ["official_match", "training", "lesson", "tournament", "challenge", "free_rental", "event"];
