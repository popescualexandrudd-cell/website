/**
 * The AI (ADR-0019, Stage 12): whether it runs (the switch `ai`, under Configuration, and the key
 * and model in the server's `.env`), what it spent this month against the limit, the tools it has
 * in each context, and the latest questions (context, result, tools, tokens, cost; never the text).
 */
import { type Schemas, unwrap } from "../api";
import { formatDate, formatTime } from "../i18n";
import { usePanel, useT } from "../panel";
import { useData } from "../ui";

type Row = Schemas["AIInteractionOut"];

/** Millionths of a dollar → "$1.25" (the provider bills in dollars). */
export function dollars(micro: number): string {
  return `$${(micro / 1_000_000).toFixed(2)}`;
}

export function AI() {
  const { api, locationId, lang } = usePanel();
  const t = useT();
  const where = { params: { query: { location_id: locationId } } };
  const state = useData(() => unwrap(api.client.GET("/api/v1/staff/ai/status", where)), [api, locationId]);
  const log = useData(() => unwrap(api.client.GET("/api/v1/staff/ai/interactions", where)), [api, locationId]);
  const s = state.data;
  return (
    <section aria-labelledby="ai-title">
      <h1 id="ai-title">{t("ai.title")}</h1>
      <p className="muted">{t("ai.lead")}</p>
      {s ? (
        <dl className="details">
          <dt>{t("ai.switch")}</dt>
          <dd>{s.enabled ? t("ai.on") : t("ai.off")}</dd>
          <dt>{t("ai.provider")}</dt>
          <dd>{s.configured ? s.model : t("ai.notConfigured")}</dd>
          <dt>{t("ai.spend")}</dt>
          <dd>{t("ai.spendOf", { spent: dollars(s.month_cost_micro_usd), budget: `$${s.budget_usd}` })}</dd>
          <dt>{t("ai.tools")}</dt>
          <dd>
            <ul>
              {Object.entries(s.tools).map(([name, contexts]) => (
                <li key={name}>
                  <code>{name}</code> · {contexts.map((c) => t(`ai.contexts.${c}`)).join(", ")}
                </li>
              ))}
            </ul>
          </dd>
        </dl>
      ) : null}
      <p className="muted">{t("ai.never")}</p>
      <h2>{t("ai.logTitle")}</h2>
      {log.data && log.data.length === 0 ? <p>{t("ai.logEmpty")}</p> : null}
      {log.data && log.data.length > 0 ? (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">{t("ai.when")}</th>
              <th scope="col">{t("ai.context")}</th>
              <th scope="col">{t("ai.outcome")}</th>
              <th scope="col">{t("ai.toolsUsed")}</th>
              <th scope="col">{t("ai.cost")}</th>
            </tr>
          </thead>
          <tbody>
            {log.data.map((row: Row) => (
              <tr key={row.id}>
                <th scope="row">
                  {formatDate(lang, row.created_at)}, {formatTime(lang, row.created_at)}
                </th>
                <td>{t(`ai.contexts.${row.context}`)}</td>
                <td>{t(`ai.outcomes.${row.outcome}`)}</td>
                <td>
                  {row.tools.length === 0
                    ? "—"
                    : row.tools
                        .map((tool) => `${String(tool.name)}${tool.ok ? "" : ` (${String(tool.error)})`}`)
                        .join(", ")}
                </td>
                <td>
                  {dollars(row.cost_micro_usd)}
                  <span className="muted"> · {t("ai.tokens", { input: row.input_tokens, output: row.output_tokens })}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
