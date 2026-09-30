"use client";

/**
 * `/cont/profil`: the visitor's details (name, phone, language), the password, the children's
 * accounts (under 14, created by a parent, Q7/Q43) and privacy (§12.2): the export of everything
 * the club holds (GDPR art. 15 and 20) and the deletion of the account, confirmed with the password.
 */
import { useFormatter, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import type * as account from "@/lib/account";
import * as member from "@/lib/member";
import { MemberOnly } from "./useMember";
import { useErrorText } from "./useErrorText";

type Report = (code: string | null, params: Record<string, string | number>) => void;

/** `childAccounts`: the club's `child_accounts` switch (Q7, off until the owner turns it on). */
export function AccountProfile({ childAccounts }: { childAccounts: boolean }) {
  return (
    <MemberOnly>
      {(me, update) => (
        <div className="account">
          <ProfileForm me={me} onSaved={update} />
          <PasswordForm />
          {childAccounts && <Children />}
          <Privacy />
        </div>
      )}
    </MemberOnly>
  );
}

function useReport(): [string, Report, (text: string) => void] {
  const errorText = useErrorText();
  const [text, setText] = useState("");
  return [text, (code, params) => setText(errorText(code, params)), setText];
}

function Status({ text }: { text: string }) {
  if (!text) return null;
  return (
    <p className="status" role="status">
      {text}
    </p>
  );
}

function ProfileForm({ me, onSaved }: { me: account.Me; onSaved: (me: account.Me) => void }) {
  const t = useTranslations("web.account.profile");
  const [firstName, setFirstName] = useState(me.first_name);
  const [lastName, setLastName] = useState(me.last_name);
  const [phone, setPhone] = useState(me.phone);
  const [language, setLanguage] = useState<"ro" | "en">(me.preferred_language === "en" ? "en" : "ro");
  const [busy, setBusy] = useState(false);
  const [text, report, say] = useReport();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const answer = await member.updateProfile({ first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim(), preferred_language: language });
    setBusy(false);
    if (!answer.ok) return report(answer.code, answer.params);
    onSaved(answer.data);
    say(t("saved"));
  };

  return (
    <section className="account__card" aria-labelledby="profile-title">
      <h2 id="profile-title" className="h3">
        {t("title")}
      </h2>
      <form className="form" onSubmit={(event) => void submit(event)}>
        <div className="account__row">
          <div className="field">
            <label htmlFor="profile-first">{t("firstName")}</label>
            <input id="profile-first" className="input" autoComplete="given-name" required maxLength={150} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="profile-last">{t("lastName")}</label>
            <input id="profile-last" className="input" autoComplete="family-name" required maxLength={150} value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <div className="account__row">
          <div className="field">
            <label htmlFor="profile-phone">{t("phone")}</label>
            <input
              id="profile-phone"
              className="input"
              type="tel"
              autoComplete="tel"
              required
              minLength={4}
              maxLength={30}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="profile-language">{t("language")}</label>
            <select id="profile-language" className="select" value={language} onChange={(e) => setLanguage(e.target.value === "en" ? "en" : "ro")}>
              <option value="ro">Română</option>
              <option value="en">English</option>
            </select>
            <span className="field__hint">{t("languageHint")}</span>
          </div>
        </div>
        <p className="field__hint">{t("emailHint", { email: me.email ?? "–" })}</p>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {t("save")}
        </button>
      </form>
      <Status text={text} />
    </section>
  );
}

function PasswordForm() {
  const t = useTranslations("web.account.password");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [text, report, say] = useReport();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const answer = await member.changePassword(current, next);
    setBusy(false);
    if (!answer.ok) return report(answer.code, answer.params);
    setCurrent("");
    setNext("");
    say(t("changed"));
  };

  return (
    <section className="account__card" aria-labelledby="password-title">
      <h2 id="password-title" className="h3">
        {t("title")}
      </h2>
      <form className="form" onSubmit={(event) => void submit(event)}>
        <div className="account__row">
          <div className="field">
            <label htmlFor="password-current">{t("current")}</label>
            <input
              id="password-current"
              className="input"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password-new">{t("new")}</label>
            <input
              id="password-new"
              className="input"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              maxLength={128}
              aria-describedby="password-new-hint"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
            <span id="password-new-hint" className="field__hint">
              {t("hint")}
            </span>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {t("submit")}
        </button>
      </form>
      <Status text={text} />
    </section>
  );
}

function Children() {
  const t = useTranslations("web.account.children");
  const format = useFormatter();
  const [list, setList] = useState<member.Child[] | null>(null);
  const [version, setVersion] = useState(0);
  const [adding, setAdding] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birth, setBirth] = useState("");
  const [busy, setBusy] = useState(false);
  const [text, report, say] = useReport();

  useEffect(() => {
    let alive = true;
    void member.children().then((answer) => {
      if (alive) setList(answer.ok ? answer.data : []);
    });
    return () => {
      alive = false;
    };
  }, [version]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const answer = await member.addChild(firstName.trim(), lastName.trim(), birth);
    setBusy(false);
    if (!answer.ok) return report(answer.code, answer.params);
    setAdding(false);
    setFirstName("");
    setLastName("");
    setBirth("");
    say(t("added", { name: answer.data.first_name }));
    setVersion((v) => v + 1);
  };

  return (
    <section className="account__card" aria-labelledby="children-title" aria-busy={list === null}>
      <h2 id="children-title" className="h3">
        {t("title")}
      </h2>
      <p className="league__text">{t("lead")}</p>
      {list && list.length > 0 && (
        <ul className="account__list">
          {list.map((child) => (
            <li key={child.id}>
              <div>
                <strong>
                  {child.first_name} {child.last_name}
                </strong>
                {child.date_of_birth && (
                  <span>{t("born", { date: format.dateTime(new Date(`${child.date_of_birth}T12:00:00Z`), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) })}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <form className="form" onSubmit={(event) => void submit(event)}>
          <div className="account__row">
            <div className="field">
              <label htmlFor="child-first">{t("firstName")}</label>
              <input id="child-first" className="input" required maxLength={150} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="child-last">{t("lastName")}</label>
              <input id="child-last" className="input" required maxLength={150} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="child-birth">{t("birth")}</label>
              <input id="child-birth" className="input" type="date" required value={birth} onChange={(e) => setBirth(e.target.value)} />
            </div>
          </div>
          <p className="account__confirm">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {t("submit")}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setAdding(false)}>
              {t("close")}
            </button>
          </p>
        </form>
      ) : (
        <p className="account__actions">
          <button type="button" className="btn btn-secondary" onClick={() => setAdding(true)}>
            {t("add")}
          </button>
        </p>
      )}
      <Status text={text} />
    </section>
  );
}

function Privacy() {
  const t = useTranslations("web.account.privacy");
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [forfeit, setForfeit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [text, report] = useReport();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const answer = await member.deleteAccount(password, forfeit);
    setBusy(false);
    if (!answer.ok) return report(answer.code, answer.params);
    setDeleted(true);
  };

  if (deleted)
    return (
      <section className="account__card" aria-labelledby="privacy-title">
        <h2 id="privacy-title" className="h3">
          {t("deletedTitle")}
        </h2>
        <p className="league__text" role="status">
          {t("deleted")}
        </p>
        <p className="account__actions">
          <Link className="btn btn-secondary" href="/">
            {t("home")}
          </Link>
        </p>
      </section>
    );

  return (
    <section className="account__card" aria-labelledby="privacy-title">
      <h2 id="privacy-title" className="h3">
        {t("title")}
      </h2>
      <h3 className="privacy__subtitle">{t("exportTitle")}</h3>
      <p className="league__text">{t("exportText")}</p>
      <p className="account__actions">
        <a className="btn btn-secondary" href={member.EXPORT_URL} download>
          {t("export")}
        </a>
      </p>
      <h3 className="privacy__subtitle">{t("deleteTitle")}</h3>
      <p className="league__text">{t("deleteText")}</p>
      {open ? (
        <form className="form" onSubmit={(event) => void submit(event)}>
          <div className="field">
            <label htmlFor="delete-password">{t("password")}</label>
            <input
              id="delete-password"
              className="input"
              type="password"
              autoComplete="current-password"
              required
              maxLength={200}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <label className="consent">
            <input type="checkbox" checked={forfeit} onChange={(e) => setForfeit(e.target.checked)} />
            <span>{t("forfeit")}</span>
          </label>
          <p className="account__confirm">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {t("confirm")}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              {t("keep")}
            </button>
          </p>
        </form>
      ) : (
        <p className="account__actions">
          <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>
            {t("delete")}
          </button>
        </p>
      )}
      <Status text={text} />
    </section>
  );
}
