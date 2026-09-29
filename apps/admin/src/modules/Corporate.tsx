/**
 * Company accounts (§8.6, R-088, Q35): the companies that buy subscriptions for their employees,
 * one company package (a single discount), invoiced to the company. Staff add and remove the
 * employees and read the monthly report (who used what) that goes with the invoice.
 */
import { type FormEvent, useState } from "react";
import { type Schemas, unwrap } from "../api";
import { clubDay } from "../clock";
import { formatMoney } from "../i18n";
import { usePanel, useT } from "../panel";
import { type Picked, UserPicker, useData } from "../ui";

type Company = Schemas["PanelCorporateOut"];

export function Corporate() {
  const { api, locationId, notify, fail } = usePanel();
  const t = useT();
  const { data, reload } = useData(() => unwrap(api.client.GET("/api/v1/staff/panel/corporate", { params: { query: { location_id: locationId } } })), [api, locationId]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", registration_code: "", billing_email: "" });
  const create = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await unwrap(api.client.POST("/api/v1/staff/corporate", { body: { location_id: locationId, ...draft, name: draft.name.trim() } }));
      notify(t("saved"));
      setAdding(false);
      setDraft({ name: "", registration_code: "", billing_email: "" });
      await reload();
    } catch (error) {
      fail(error);
    }
  };
  return (
    <section aria-labelledby="corporate-title">
      <h1 id="corporate-title">{t("corporate.title")}</h1>
      <p className="muted">{t("corporate.intro")}</p>
      <div className="toolbar">
        <button type="button" className="button" onClick={() => setAdding(!adding)}>
          {t("corporate.add")}
        </button>
      </div>
      {adding ? (
        <form className="inline-form" onSubmit={(e) => void create(e)} aria-label={t("corporate.add")}>
          <label>
            {t("corporate.name")}
            <input required maxLength={200} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label>
            {t("corporate.code")}
            <input maxLength={20} value={draft.registration_code} onChange={(e) => setDraft({ ...draft, registration_code: e.target.value })} />
          </label>
          <label>
            {t("corporate.email")}
            <input type="email" value={draft.billing_email} onChange={(e) => setDraft({ ...draft, billing_email: e.target.value })} />
          </label>
          <button type="submit" className="button button--primary">
            {t("corporate.create")}
          </button>
        </form>
      ) : null}
      {data && data.length === 0 ? <p>{t("corporate.none")}</p> : null}
      {(data ?? []).map((c) => (
        <CompanyCard key={c.id} company={c} onChanged={reload} />
      ))}
    </section>
  );
}

function CompanyCard({ company, onChanged }: { company: Company; onChanged: () => Promise<void> }) {
  const { api, lang, notify, fail } = usePanel();
  const t = useT();
  const [member, setMember] = useState<Picked | null>(null);
  const [month, setMonth] = useState(() => clubDay(Date.now()).slice(0, 7));
  const [report, setReport] = useState<Schemas["ReportOut"] | null>(null);
  const path = { account_id: company.id };
  const run = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      notify(message);
      await onChanged();
    } catch (error) {
      fail(error);
    }
  };
  const load = async () => {
    const [year, m] = month.split("-").map(Number) as [number, number];
    try {
      setReport(await unwrap(api.client.GET("/api/v1/staff/corporate/{account_id}/report", { params: { path, query: { year, month: m } } })));
    } catch (error) {
      fail(error);
    }
  };
  return (
    <article className="panel-box" aria-labelledby={`company-${company.id}`}>
      <h2 id={`company-${company.id}`}>
        {company.name}
        {company.is_active ? null : <span className="muted"> · {t("corporate.inactive")}</span>}
      </h2>
      <p className="muted">
        {[company.registration_code, company.billing_email].filter(Boolean).join(" · ") || "—"}
      </p>
      <h3>{t("corporate.members", { count: company.members.length })}</h3>
      <ul>
        {company.members.map((m) => (
          <li key={m.id}>
            <a href={`#/users/${m.id}`}>{m.name}</a>{" "}
            <button
              type="button"
              className="link"
              onClick={() =>
                void run(
                  () => unwrap(api.client.POST("/api/v1/staff/corporate/{account_id}/members/{user_id}/remove", { params: { path: { ...path, user_id: m.id } } })),
                  t("corporate.removed"),
                )
              }
            >
              {t("corporate.remove", { name: m.name })}
            </button>
          </li>
        ))}
      </ul>
      <div className="inline-form">
        <UserPicker label={t("corporate.employee")} value={member} onPick={setMember} />
        <button
          type="button"
          className="button button--primary"
          disabled={!member}
          onClick={() =>
            void run(async () => {
              await unwrap(api.client.POST("/api/v1/staff/corporate/{account_id}/members", { params: { path }, body: { user_id: member?.id ?? "" } }));
              setMember(null);
            }, t("corporate.added"))
          }
        >
          {t("corporate.addMember")}
        </button>
      </div>
      <div className="toolbar">
        <label>
          {t("corporate.month")}
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
        <button type="button" className="button" onClick={() => void load()}>
          {t("corporate.report")}
        </button>
      </div>
      {report ? (
        <div role="region" aria-label={t("corporate.report")}>
          <p>{t("corporate.billed", { amount: formatMoney(lang, report.billed) })}</p>
          <table className="table">
            <tbody>
              {report.members.map((m) => (
                <tr key={m.user_id}>
                  <th scope="row">{m.name}</th>
                  <td>
                    {Object.entries(m.sessions)
                      .map(([sport, count]) => `${t(`pricing.sports.${sport}`)}: ${String(count)}`)
                      .join(" · ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </article>
  );
}
