/**
 * Users (§8.6, R-004): search, the person's details, account balance, league and level, cards,
 * recent bookings; the staff actions each with a reason (activate / deactivate, roles, cards,
 * "do not show my name on the screens" — Q55, GDPR art. 21 —, erasure — R-011), all recorded
 * in the audit log. A new guest account for someone at the reception.
 */
import { type FormEvent, useState } from "react";
import { unwrap } from "../api";
import { formatDate, formatMoney, formatTime } from "../i18n";
import { usePanel, useT } from "../panel";
import { ReasonAction, useData } from "../ui";

const PAGE = 25;
const ROLES = ["admin", "manager", "reception", "coach"] as const;

export function Users() {
  const { path } = usePanel();
  return path[0] ? <Person id={path[0]} /> : <UserList />;
}

function UserList() {
  const { api, can, go, notify, fail } = usePanel();
  const t = useT();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const { data } = useData(
    () => unwrap(api.client.GET("/api/v1/staff/users", { params: { query: { q: search, limit: PAGE, offset } } })),
    [api, search, offset],
  );
  const [guest, setGuest] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [adding, setAdding] = useState(false);

  const find = (event: FormEvent) => {
    event.preventDefault();
    setOffset(0);
    setSearch(query.trim());
  };
  const addGuest = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const created = await unwrap(
        api.client.POST("/api/v1/staff/guests", {
          body: { ...guest, email: guest.email.trim() },
        }),
      );
      notify(t("users.guestCreated"));
      go(`users/${created.id}`);
    } catch (error) {
      fail(error);
    }
  };

  return (
    <section aria-labelledby="users-title">
      <h1 id="users-title">{t("users.title")}</h1>
      <form className="toolbar" onSubmit={find} role="search">
        <label>
          {t("users.search")}
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <button type="submit" className="button button--primary">
          {t("users.find")}
        </button>
        {can("accounts.create_guest") ? (
          <button type="button" className="button" onClick={() => setAdding(!adding)}>
            {t("users.newGuest")}
          </button>
        ) : null}
      </form>
      {adding ? (
        <form className="inline-form" onSubmit={(e) => void addGuest(e)} aria-label={t("users.newGuest")}>
          {(["first_name", "last_name", "email", "phone"] as const).map((key) => (
            <label key={key}>
              {t(`users.fields.${key}`)}
              <input
                required={key !== "phone"}
                type={key === "email" ? "email" : "text"}
                value={guest[key]}
                onChange={(e) => setGuest({ ...guest, [key]: e.target.value })}
              />
            </label>
          ))}
          <button type="submit" className="button button--primary">
            {t("users.create")}
          </button>
        </form>
      ) : null}
      <table className="table">
        <thead>
          <tr>
            <th scope="col">{t("users.fields.name")}</th>
            <th scope="col">{t("users.fields.email")}</th>
            <th scope="col">{t("users.fields.phone")}</th>
            <th scope="col">{t("users.fields.status")}</th>
          </tr>
        </thead>
        <tbody>
          {(data?.items ?? []).map((u) => (
            <tr key={u.id}>
              <th scope="row">
                <a href={`#/users/${u.id}`}>
                  {u.last_name} {u.first_name}
                </a>
                {u.is_demo ? <span className="muted"> · DEMO</span> : null}
              </th>
              <td>{u.email ?? "—"}</td>
              <td>{u.phone || "—"}</td>
              <td>{u.is_active ? t("users.active") : t("users.inactive")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data ? (
        <div className="pager">
          <button type="button" className="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
            {t("previous")}
          </button>
          <span className="muted">{t("users.count", { from: data.total ? offset + 1 : 0, to: Math.min(offset + PAGE, data.total), total: data.total })}</span>
          <button type="button" className="button" disabled={offset + PAGE >= data.total} onClick={() => setOffset(offset + PAGE)}>
            {t("next")}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function Person({ id }: { id: string }) {
  const { api, lang, can, locationId, permissions, notify } = usePanel();
  const t = useT();
  const user = useData(() => unwrap(api.client.GET("/api/v1/staff/users/{user_id}", { params: { path: { user_id: id } } })), [api, id]);
  const profile = useData(
    () =>
      unwrap(
        api.client.GET("/api/v1/staff/panel/users/{user_id}/profile", {
          params: { path: { user_id: id }, query: { location_id: locationId } },
        }),
      ),
    [api, id, locationId],
  );
  const money = useData(
    () =>
      can("payments.view")
        ? unwrap(
            api.client.GET("/api/v1/staff/customers/{user_id}/account", {
              params: { path: { user_id: id }, query: { location_id: locationId } },
            }),
          )
        : Promise.resolve(null),
    [api, id, locationId],
  );
  const [role, setRole] = useState<string>("reception");
  const [roleLocation, setRoleLocation] = useState<string>(locationId);
  const [print, setPrint] = useState(true);
  const [forfeit, setForfeit] = useState(false);

  const reloadAll = async () => {
    await Promise.all([user.reload(), profile.reload()]);
  };
  const u = user.data;
  const p = profile.data;
  if (!u) return <p className="muted">{t("loading")}</p>;
  const locationName = (lid: string | null | undefined) =>
    lid ? (permissions.scopes.find((s) => s.location_id === lid)?.location_name ?? lid) : t("users.everywhere");

  return (
    <section aria-labelledby="person-title">
      <p>
        <a href="#/users">← {t("users.title")}</a>
      </p>
      <h1 id="person-title">
        {u.last_name} {u.first_name}
      </h1>
      <dl className="details">
        <dt>{t("users.fields.email")}</dt>
        <dd>
          {u.email ?? "—"} {u.email_verified_at ? `(${t("users.verified")})` : `(${t("users.notVerified")})`}
        </dd>
        <dt>{t("users.fields.phone")}</dt>
        <dd>{u.phone || "—"}</dd>
        <dt>{t("users.fields.birth")}</dt>
        <dd>{u.date_of_birth ? formatDate(lang, u.date_of_birth) : "—"}</dd>
        <dt>{t("users.fields.type")}</dt>
        <dd>{t(`users.types.${u.account_type}`)}</dd>
        <dt>{t("users.fields.language")}</dt>
        <dd>{u.preferred_language.toUpperCase()}</dd>
        <dt>{t("users.fields.created")}</dt>
        <dd>{formatDate(lang, u.created_at)}</dd>
        <dt>{t("users.fields.mfa")}</dt>
        <dd>{u.mfa_enabled ? t("yes") : t("no")}</dd>
        <dt>{t("users.fields.status")}</dt>
        <dd>{u.is_active ? t("users.active") : t("users.inactive")}</dd>
        {money.data ? (
          <>
            <dt>{t("users.fields.credit")}</dt>
            <dd>{formatMoney(lang, money.data.credit)}</dd>
            <dt>{t("users.fields.debt")}</dt>
            <dd>{formatMoney(lang, money.data.debt)}</dd>
          </>
        ) : null}
        {p ? (
          <>
            <dt>{t("users.fields.league")}</dt>
            <dd>{p.in_league ? t("users.inLeague") : t("users.notInLeague")}</dd>
            <dt>{t("users.fields.level")}</dt>
            <dd>{p.level_validated ?? (p.level_waiting ? t("users.levelWaiting") : "—")}</dd>
            <dt>{t("users.fields.screens")}</dt>
            <dd>{p.hidden_on_screens ? t("users.hidden") : t("users.shown")}</dd>
          </>
        ) : null}
      </dl>

      <div className="actions">
        {can("users.manage") ? (
          <ReasonAction
            label={u.is_active ? t("users.deactivate") : t("users.activate")}
            danger={u.is_active}
            onConfirm={async (reason) => {
              await unwrap(
                api.client.POST("/api/v1/staff/users/{user_id}/active", {
                  params: { path: { user_id: id } },
                  body: { is_active: !u.is_active, reason },
                }),
              );
              notify(t("saved"));
              await reloadAll();
            }}
          />
        ) : null}
        {can("privacy.requests") && p ? (
          <ReasonAction
            label={p.hidden_on_screens ? t("users.showName") : t("users.hideName")}
            onConfirm={async (reason) => {
              await unwrap(
                api.client.POST("/api/v1/staff/panel/users/{user_id}/hidden-on-screens", {
                  params: { path: { user_id: id } },
                  body: { location_id: locationId, hidden: !p.hidden_on_screens, note: reason },
                }),
              );
              notify(t("saved"));
              await profile.reload();
            }}
          />
        ) : null}
        {can("cards.manage") ? (
          <ReasonAction
            label={t("users.reissue")}
            onConfirm={async (reason) => {
              await unwrap(
                api.client.POST("/api/v1/staff/cards/reissue", {
                  body: { user_id: id, location_id: locationId, reason, print_card: print },
                }),
              );
              notify(t("saved"));
              await profile.reload();
            }}
          >
            <label className="check">
              <input type="checkbox" checked={print} onChange={(e) => setPrint(e.target.checked)} /> {t("users.print")}
            </label>
          </ReasonAction>
        ) : null}
        {can("users.manage") ? (
          <ReasonAction
            label={t("users.erase")}
            danger
            onConfirm={async (reason) => {
              await unwrap(
                api.client.POST("/api/v1/staff/users/{user_id}/erase", {
                  params: { path: { user_id: id } },
                  body: { reason, forfeit_credit: forfeit },
                }),
              );
              notify(t("users.erased"));
              await reloadAll();
            }}
          >
            <p className="notice">{t("users.eraseWarning")}</p>
            <label className="check">
              <input type="checkbox" checked={forfeit} onChange={(e) => setForfeit(e.target.checked)} /> {t("users.forfeit")}
            </label>
          </ReasonAction>
        ) : null}
      </div>

      <h2>{t("users.roles")}</h2>
      {u.roles.length === 0 ? <p className="muted">{t("users.noRoles")}</p> : null}
      <ul>
        {u.roles.map((r) => (
          <li key={r.id}>
            {t(`roles.${r.role}`)} · {locationName(r.location_id)}{" "}
            {can("roles.manage") ? (
              <ReasonAction
                label={t("users.revoke")}
                danger
                onConfirm={async (reason) => {
                  await unwrap(api.client.POST("/api/v1/staff/roles/{role_id}/revoke", { params: { path: { role_id: r.id } }, body: { reason } }));
                  notify(t("saved"));
                  await user.reload();
                }}
              />
            ) : null}
          </li>
        ))}
      </ul>
      {can("roles.manage") ? (
        <ReasonAction
          label={t("users.grant")}
          onConfirm={async (reason) => {
            await unwrap(
              api.client.POST("/api/v1/staff/users/{user_id}/roles", {
                params: { path: { user_id: id } },
                body: { role, location_id: roleLocation || null, reason },
              }),
            );
            notify(t("saved"));
            await user.reload();
          }}
        >
          <label>
            {t("users.role")}
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`roles.${r}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("location")}
            <select value={roleLocation} onChange={(e) => setRoleLocation(e.target.value)}>
              <option value="">{t("users.everywhere")}</option>
              {permissions.scopes.map((s) => (
                <option key={s.location_id} value={s.location_id}>
                  {s.location_name}
                </option>
              ))}
            </select>
          </label>
        </ReasonAction>
      ) : null}

      <h2>{t("users.cards")}</h2>
      <table className="table">
        <thead>
          <tr>
            <th scope="col">{t("users.cardNumber")}</th>
            <th scope="col">{t("users.fields.status")}</th>
            <th scope="col">{t("users.issued")}</th>
            <th scope="col" />
          </tr>
        </thead>
        <tbody>
          {(p?.cards ?? []).map((c) => (
            <tr key={c.id}>
              <th scope="row">{c.number}</th>
              <td>
                {c.status === "active" ? t("users.cardActive") : t("users.cardBlocked")}
                {c.revoke_reason ? ` · ${c.revoke_reason}` : ""}
              </td>
              <td>{formatDate(lang, c.issued_at)}</td>
              <td>
                {c.status === "active" && can("cards.manage") ? (
                  <ReasonAction
                    label={t("users.block")}
                    danger
                    onConfirm={async (reason) => {
                      await unwrap(
                        api.client.POST("/api/v1/staff/cards/{card_id}/block", {
                          params: { path: { card_id: c.id } },
                          body: { location_id: locationId, reason },
                        }),
                      );
                      notify(t("saved"));
                      await profile.reload();
                    }}
                  />
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>{t("users.bookings")}</h2>
      <table className="table">
        <tbody>
          {(p?.bookings ?? []).map((b) => (
            <tr key={b.id}>
              <th scope="row">{b.resource}</th>
              <td>
                {formatDate(lang, b.starts_at)}, {formatTime(lang, b.starts_at)}–{formatTime(lang, b.ends_at)}
              </td>
              <td>{t(`sessionTypes.${b.session_type}`)}</td>
              <td>{t(`bookingStatus.${b.status}`)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>{t("users.consents")}</h2>
      <ul>
        {u.consents.map((c) => (
          <li key={`${c.document_kind}:${c.occurred_at}:${c.action}`}>
            {c.document_kind} v{c.document_version} · {c.action} · {formatDate(lang, c.occurred_at)}
          </li>
        ))}
      </ul>
    </section>
  );
}
