/**
 * The admin panel (§8.6): staff sign in with two-factor authentication (ADR-0011), choose the
 * location, and see only the modules their role allows there. Each module reads and changes
 * data through the staff API; the server checks every action again and keeps the audit log.
 * Navigation is in the address (`#/users`), so a page can be reloaded or bookmarked.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi, ApiError, Offline, type Permissions } from "./api";
import { errorText, type Lang, t } from "./i18n";
import { Login } from "./Login";
import { allowed, MODULES } from "./modules";
import { actionsAt, type Panel, PanelContext } from "./panel";

type Message = { text: string; kind: "ok" | "error" };
const LOCATION_KEY = "jungle.admin.location";

function routeOf(hash: string): string {
  return hash.replace(/^#\/?/, "").split("?")[0] || "dashboard";
}

function remembered(): string {
  try {
    return localStorage.getItem(LOCATION_KEY) ?? "";
  } catch {
    return "";
  }
}

export function App() {
  const api = useMemo(() => adminApi(), []);
  const [lang, setLang] = useState<Lang>("ro");
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [state, setState] = useState<"loading" | "login" | "denied" | "ready">("loading");
  const [locationId, setLocationId] = useState(remembered());
  const [route, setRoute] = useState(routeOf(window.location.hash));
  const [message, setMessage] = useState<Message | null>(null);

  const load = useCallback(async () => {
    try {
      const found = await api.permissions();
      setPermissions(found);
      setLocationId((current) =>
        found.scopes.some((s) => s.location_id === current) ? current : (found.scopes[0]?.location_id ?? ""),
      );
      setState("ready");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setState("login");
      else if (error instanceof ApiError && error.code === "auth.mfa_required") setState("login");
      else if (error instanceof ApiError) setState("denied");
      else setState("login");
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onHash = () => setRoute(routeOf(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    try {
      if (locationId) localStorage.setItem(LOCATION_KEY, locationId);
    } catch {
      // storage refused: the choice lasts this visit only
    }
  }, [locationId]);

  const notify = useCallback((text: string, kind: "ok" | "error" = "ok") => setMessage({ text, kind }), []);
  const fail = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setState("login");
          return;
        }
        notify(errorText(lang, error.code, error.params), "error");
      } else if (error instanceof Offline) {
        notify(t(lang, "offline"), "error");
      } else {
        notify(t(lang, "errors.generic"), "error");
      }
    },
    [lang, notify],
  );
  const go = useCallback((next: string) => {
    window.location.hash = `#/${next}`;
  }, []);

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // the session may already be over
    }
    setPermissions(null);
    setState("login");
  };

  if (state === "loading") return <p className="muted page-loading">{t(lang, "loading")}</p>;
  if (state === "login") return <Login api={api} lang={lang} onDone={() => void load()} />;
  if (state === "denied" || !permissions) {
    return (
      <main className="login" lang={lang}>
        <section className="login__card panel">
          <h1>{t(lang, "denied.title")}</h1>
          <p>{t(lang, "denied.text")}</p>
          <button type="button" className="button" onClick={() => void logout()}>
            {t(lang, "logout")}
          </button>
        </section>
      </main>
    );
  }

  const actions = actionsAt(permissions, locationId);
  const can = (action: string) => actions.has(action);
  const menu = allowed(MODULES, can);
  const [base = "", ...path] = route.split("/");
  const current = menu.find((m) => m.route === base) ?? menu[0];
  const panel: Panel = { api, lang, permissions, locationId, can, notify, fail, go, path: current?.route === base ? path : [] };
  const Current = current?.component;

  return (
    <PanelContext.Provider value={panel}>
      <div className="shell" lang={lang}>
        <aside className="shell__side">
          <p className="brand">Jungle Padel</p>
          <nav aria-label={t(lang, "nav.label")}>
            <ul className="nav">
              {menu.map((m) => (
                <li key={m.route}>
                  <a href={`#/${m.route}`} aria-current={m === current ? "page" : undefined}>
                    {t(lang, `nav.${m.label}`)}
                    {m.stage ? <span className="nav__later"> · {t(lang, "upcoming.short", { stage: m.stage })}</span> : null}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <div className="shell__main">
          <header className="topbar">
            <label className="topbar__location">
              {t(lang, "location")}
              <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                {permissions.scopes.map((s) => (
                  <option key={s.location_id} value={s.location_id}>
                    {s.location_name}
                  </option>
                ))}
              </select>
            </label>
            <span className="topbar__user">
              {permissions.user.first_name} {permissions.user.last_name}
            </span>
            <button type="button" className="button button--quiet" onClick={() => setLang(lang === "ro" ? "en" : "ro")}>
              {t(lang, "language")}
            </button>
            <button type="button" className="button button--quiet" onClick={() => void logout()}>
              {t(lang, "logout")}
            </button>
          </header>
          {message ? (
            <p className={`banner banner--${message.kind}`} role={message.kind === "error" ? "alert" : "status"}>
              {message.text}{" "}
              <button type="button" className="link" onClick={() => setMessage(null)}>
                {t(lang, "close")}
              </button>
            </p>
          ) : null}
          <main className="content">{Current ? <Current key={`${route}:${locationId}`} /> : <p>{t(lang, "empty")}</p>}</main>
        </div>
      </div>
    </PanelContext.Provider>
  );
}
