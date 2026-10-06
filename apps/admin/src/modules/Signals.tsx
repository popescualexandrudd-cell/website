/**
 * Signals and demand (§10, Stage 12F), for the owner's side (`reports.view`): what may be worth a
 * look, computed by the server from the club's records (repeated league matches, disputed scores,
 * cash differences, many corrections, clients who often cancel late or do not come), and how full
 * the padel courts were in each price band, with a suggestion that stays a proposal (prices change
 * only in the Pricing module), plus the next seven days. Nothing here changes anything.
 */
import { type Schemas, unwrap } from "../api";
import { formatDate, formatTime } from "../i18n";
import { usePanel, useT } from "../panel";
import { useData } from "../ui";

type Signal = Schemas["PanelSignalOut"];

/** Minutes → hours as a person reads them: 90 → "1,5" (RO), "1.5" (EN). */
export function hours(minutes: number, lang: string): string {
  const value = Math.round((minutes / 60) * 10) / 10;
  return lang === "ro" ? String(value).replace(".", ",") : String(value);
}

export function Signals() {
  const { api, locationId, lang } = usePanel();
  const t = useT();
  const where = { params: { query: { location_id: locationId } } };
  const found = useData(
    () => unwrap(api.client.GET("/api/v1/staff/panel/signals", where)),
    [api, locationId],
  );
  const demand = useData(
    () => unwrap(api.client.GET("/api/v1/staff/panel/demand", where)),
    [api, locationId],
  );
  const d = demand.data;
  return (
    <section aria-labelledby="signals-title">
      <h1 id="signals-title">{t("signals.title")}</h1>
      <p className="muted">{t("signals.lead")}</p>
      <h2>{t("signals.signalsTitle")}</h2>
      {found.data && found.data.length === 0 ? (
        <p>{t("signals.none")}</p>
      ) : null}
      {found.data && found.data.length > 0 ? (
        <ul className="signal-list">
          {found.data.map((s: Signal, n) => (
            <li key={`${s.kind}:${n}`}>
              {t(`signals.kinds.${s.kind.replace(".", "_")}`, s.params)}
              {s.at ? (
                <span className="muted">
                  {" · "}
                  {formatDate(lang, s.at)}, {formatTime(lang, s.at)}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {d ? (
        <>
          <h2>
            {t("signals.demandTitle", {
              first: formatDate(lang, d.first),
              last: formatDate(lang, d.last),
            })}
          </h2>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">{t("signals.band")}</th>
                <th scope="col">{t("signals.use")}</th>
                <th scope="col">{t("signals.suggestion")}</th>
              </tr>
            </thead>
            <tbody>
              {d.bands.map((b) => (
                <tr key={b.band}>
                  <th scope="row">{t(`signals.bands.${b.band}`)}</th>
                  <td>
                    {t("signals.useOf", {
                      percent: b.percent,
                      booked: hours(b.booked_minutes, lang),
                      open: hours(b.open_minutes, lang),
                    })}
                  </td>
                  <td>
                    {b.suggestion
                      ? t(`signals.suggestions.${b.suggestion}`, {
                          step: b.step_percent,
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">{t("signals.proposal")}</p>
          <h2>{t("signals.outlookTitle")}</h2>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">{t("signals.day")}</th>
                <th scope="col">{t("signals.use")}</th>
              </tr>
            </thead>
            <tbody>
              {d.outlook.map((day) => (
                <tr key={day.day}>
                  <th scope="row">{formatDate(lang, day.day)}</th>
                  <td>
                    {t("signals.useOf", {
                      percent: day.percent,
                      booked: hours(day.booked_minutes, lang),
                      open: hours(day.open_minutes, lang),
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </section>
  );
}
