/**
 * Resources (§8.6, §4.3): the courts, the Pilates studio and its Reformers (Q46: 4 now, 6
 * later), the event room. A resource taken out of use keeps its history; it simply stops
 * accepting bookings. Every change is recorded with its reason.
 */
import { type FormEvent, useState } from "react";
import { type Schemas, unwrap } from "../api";
import { usePanel, useT } from "../panel";
import { ReasonAction, useData } from "../ui";

type Resource = Schemas["ResourceOut"];
const KINDS = ["padel_court", "tennis_court", "pilates_studio", "reformer", "event_room"] as const;

export function Resources() {
  const { api, locationId, can, notify, fail } = usePanel();
  const t = useT();
  const { data, reload } = useData(() => unwrap(api.client.GET("/api/v1/staff/panel/resources", { params: { query: { location_id: locationId } } })), [api, locationId]);
  const manage = can("resources.manage");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", slug: "", kind: "padel_court" as (typeof KINDS)[number], capacity: "", parent_id: "" });
  const studios = (data ?? []).filter((r) => r.kind === "pilates_studio");

  const add = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await unwrap(
        api.client.POST("/api/v1/staff/resources", {
          body: {
            location_id: locationId,
            name: draft.name.trim(),
            slug: draft.slug.trim(),
            kind: draft.kind,
            capacity: draft.capacity ? Number(draft.capacity) : null,
            parent_id: draft.kind === "reformer" && draft.parent_id ? draft.parent_id : null,
            sort_order: (data?.length ?? 0) + 1,
            is_active: true,
          },
        }),
      );
      notify(t("saved"));
      setAdding(false);
      await reload();
    } catch (error) {
      fail(error);
    }
  };

  const patch = async (resource: Resource, body: Schemas["ResourcePatch"]) => {
    await unwrap(api.client.PATCH("/api/v1/staff/resources/{resource_id}", { params: { path: { resource_id: resource.id } }, body }));
    notify(t("saved"));
    await reload();
  };

  return (
    <section aria-labelledby="resources-title">
      <h1 id="resources-title">{t("resources.title")}</h1>
      <p className="muted">{t("resources.intro")}</p>
      {manage ? (
        <div className="toolbar">
          <button type="button" className="button" onClick={() => setAdding(!adding)}>
            {t("resources.add")}
          </button>
        </div>
      ) : null}
      {adding ? (
        <form className="inline-form" onSubmit={(e) => void add(e)} aria-label={t("resources.add")}>
          <label>
            {t("resources.name")}
            <input required maxLength={100} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label>
            {t("resources.slug")}
            <input required pattern="[a-z0-9-]+" maxLength={60} value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
          </label>
          <label>
            {t("resources.kind")}
            <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as (typeof KINDS)[number] })}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`resources.kinds.${k}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("resources.capacity")}
            <input type="number" min={1} max={500} value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: e.target.value })} />
          </label>
          {draft.kind === "reformer" ? (
            <label>
              {t("resources.parent")}
              <select required value={draft.parent_id} onChange={(e) => setDraft({ ...draft, parent_id: e.target.value })}>
                <option value="">—</option>
                {studios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button type="submit" className="button button--primary">
            {t("resources.create")}
          </button>
        </form>
      ) : null}
      <table className="table">
        <thead>
          <tr>
            <th scope="col">{t("resources.name")}</th>
            <th scope="col">{t("resources.kind")}</th>
            <th scope="col">{t("resources.capacity")}</th>
            <th scope="col">{t("resources.state")}</th>
            {manage ? <th scope="col">{t("resources.actions")}</th> : null}
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((r) => (
            <ResourceRow key={r.id} resource={r} manage={manage} onPatch={patch} />
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ResourceRow({ resource, manage, onPatch }: { resource: Resource; manage: boolean; onPatch: (r: Resource, body: Schemas["ResourcePatch"]) => Promise<void> }) {
  const t = useT();
  const [name, setName] = useState(resource.name);
  const [capacity, setCapacity] = useState(resource.capacity === null ? "" : String(resource.capacity));
  return (
    <tr>
      <th scope="row">{resource.name}</th>
      <td>{t(`resources.kinds.${resource.kind}`)}</td>
      <td>{resource.capacity ?? "—"}</td>
      <td>{resource.is_active ? t("resources.inUse") : t("resources.outOfUse")}</td>
      {manage ? (
        <td>
          <div className="actions">
            <ReasonAction
              label={resource.is_active ? t("resources.deactivate") : t("resources.activate")}
              danger={resource.is_active}
              onConfirm={(reason) => onPatch(resource, { is_active: !resource.is_active, reason })}
            />
            <ReasonAction label={t("resources.edit")} onConfirm={(reason) => onPatch(resource, { name: name.trim(), capacity: capacity ? Number(capacity) : null, reason })}>
              <label>
                {t("resources.name")}
                <input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label>
                {t("resources.capacity")}
                <input type="number" min={1} max={500} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
              </label>
            </ReasonAction>
          </div>
        </td>
      ) : null}
    </tr>
  );
}
