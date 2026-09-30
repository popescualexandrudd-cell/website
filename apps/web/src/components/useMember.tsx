"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import * as account from "@/lib/account";

type State = { kind: "loading" } | { kind: "anonymous" } | { kind: "offline" } | { kind: "user"; me: account.Me };

/** The visitor behind the session cookie (ADR-0011), read once per page. */
export function useMember(): [State, (me: account.Me) => void] {
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
  return [state, (me) => setState({ kind: "user", me })];
}

/** The account's inner pages: shown only to a signed-in visitor; otherwise a way to sign in. */
export function MemberOnly({ children }: { children: (me: account.Me, update: (me: account.Me) => void) => ReactNode }) {
  const t = useTranslations("web.account");
  const [state, update] = useMember();
  if (state.kind === "loading")
    return (
      <p className="status" aria-live="polite">
        {t("loading")}
      </p>
    );
  if (state.kind === "offline")
    return (
      <p className="status" data-kind="error" role="alert">
        {t("offline")}
      </p>
    );
  if (state.kind === "anonymous")
    return (
      <div className="account__alert account__panel">
        <p>{t("signInFirst")}</p>
        <Link className="btn btn-primary" href="/account">
          {t("signIn")}
        </Link>
      </div>
    );
  return <>{children(state.me, update)}</>;
}
