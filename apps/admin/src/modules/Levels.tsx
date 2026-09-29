/** R-003: the level questionnaires waiting for a coach (or the manager) to validate the
 * starting level (1.0–7.0) before the player may enter the league. */
import { useState } from "react";
import { unwrap } from "../api";
import { formatDate } from "../i18n";
import { usePanel, useT } from "../panel";
import { useData } from "../ui";

export function Levels() {
  const { api, lang, locationId, notify, fail } = usePanel();
  const t = useT();
  const { data, reload } = useData(
    () => unwrap(api.client.GET("/api/v1/staff/league/questionnaires", { params: { query: { location_id: locationId } } })),
    [api, locationId],
  );
  const [levels, setLevels] = useState<Record<string, string>>({});

  const validate = async (id: string, estimated: string) => {
    try {
      await unwrap(
        api.client.POST("/api/v1/staff/league/questionnaires/{questionnaire_id}/validate", {
          params: { path: { questionnaire_id: id } },
          body: { location_id: locationId, level: levels[id] ?? estimated, note: "" },
        }),
      );
      notify(t("levels.done"));
      await reload();
    } catch (error) {
      fail(error);
    }
  };

  const waiting = (data ?? []).filter((q) => !q.validated_at);
  return (
    <section aria-labelledby="levels-title">
      <h1 id="levels-title">{t("levels.title")}</h1>
      <p className="muted">{t("levels.intro")}</p>
      {data && waiting.length === 0 ? <p className="notice">{t("levels.none")}</p> : null}
      <table className="table">
        <tbody>
          {waiting.map((q) => (
            <tr key={q.id}>
              <th scope="row">
                <a href={`#/users/${q.user_id}`}>{q.name}</a>
                <br />
                <span className="muted">{formatDate(lang, q.submitted_at)}</span>
              </th>
              <td>
                <ul className="answers">
                  {Object.entries(q.answers).map(([key, value]) => (
                    <li key={key}>
                      {key}: {String(value)}
                    </li>
                  ))}
                </ul>
              </td>
              <td>
                <label>
                  {t("levels.level", { estimated: q.estimated_level })}
                  <input
                    type="number"
                    min={1}
                    max={7}
                    step={0.1}
                    value={levels[q.id] ?? q.estimated_level}
                    onChange={(e) => setLevels({ ...levels, [q.id]: e.target.value })}
                  />
                </label>
              </td>
              <td>
                <button type="button" className="button button--primary" onClick={() => void validate(q.id, q.estimated_level)}>
                  {t("levels.validate")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
