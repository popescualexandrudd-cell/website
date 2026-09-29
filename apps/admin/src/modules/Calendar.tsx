/**
 * The bookings calendar (§8.6): one day, one column per court (and Reformer, event room), rows of
 * half an hour within the opening hours (Q3). A free cell opens a new booking for a customer; a
 * booking is moved by dragging it onto another cell (or from its details, with the keyboard) and
 * cancelled from its details. Every move and cancellation asks for a reason (audit). The server
 * applies the same rules as online (R-041 grid, R-043 no overlap, the coach free) and answers
 * with a stable error code when something does not fit.
 */
import { type FormEvent, useState } from "react";
import { type Schemas, unwrap } from "../api";
import { addDays, clubDay, clubMinutes, clubMoment, hhmm, toMinutes } from "../clock";
import { formatDate, formatMoney, formatTime } from "../i18n";
import { usePanel, useT } from "../panel";
import { type Picked, ReasonAction, UserPicker, useData } from "../ui";

type Booking = Schemas["StaffBookingOut"];
type Resource = Schemas["ResourceOut"];

const SLOT = 30;
const ROW_PX = 28;
/** What staff book from the calendar on each kind of resource; league matches, tournaments and
 * challenges come from the league, events from the events module. */
export const BOOKABLE: Record<string, string[]> = {
  padel_court: ["free_rental", "training", "lesson"],
  tennis_court: ["free_rental", "training", "lesson"],
  reformer: ["lesson"],
};
const SHOWN = new Set(["padel_court", "tennis_court", "reformer", "event_room"]);
const DURATIONS = [60, 90, 120, 150, 180];

type Cell = { resource: Resource; minutes: number };

export function Calendar() {
  const { api, locationId, lang, can } = usePanel();
  const t = useT();
  const [day, setDay] = useState(() => clubDay(Date.now()));
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Cell | null>(null);
  const [moving, setMoving] = useState<{ booking: Booking; to: Cell } | null>(null);
  const [dragged, setDragged] = useState<string | null>(null);
  const query = { location_id: locationId };
  const resources = useData(() => unwrap(api.client.GET("/api/v1/staff/panel/resources", { params: { query } })), [api, locationId]);
  const hours = useData(() => unwrap(api.client.GET("/api/v1/staff/panel/hours", { params: { query: { ...query, day } } })), [api, locationId, day]);
  const bookings = useData(() => unwrap(api.client.GET("/api/v1/staff/bookings", { params: { query: { ...query, day } } })), [api, locationId, day]);
  const manage = can("bookings.manage");

  const columns = (resources.data ?? []).filter((r) => r.is_active && SHOWN.has(r.kind));
  const opens = hours.data ? toMinutes(hours.data.opens) : 480;
  const closes = hours.data ? toMinutes(hours.data.closes) : 1380;
  const slots: number[] = [];
  for (let m = opens; m < closes; m += SLOT) slots.push(m);
  const live = (bookings.data ?? []).filter((b) => b.status !== "cancelled");
  const cancelled = (bookings.data ?? []).length - live.length;
  const current = (bookings.data ?? []).find((b) => b.id === selected) ?? null;

  const refresh = async () => {
    await bookings.reload();
  };
  const drop = (cell: Cell) => {
    const booking = live.find((b) => b.id === dragged);
    setDragged(null);
    if (booking && manage) setMoving({ booking, to: cell });
  };

  return (
    <section aria-labelledby="calendar-title">
      <h1 id="calendar-title">{t("calendar.title")}</h1>
      <div className="toolbar">
        <button type="button" className="button" onClick={() => setDay(addDays(day, -1))}>
          {t("calendar.prevDay")}
        </button>
        <label>
          {t("calendar.day")}
          <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
        </label>
        <button type="button" className="button" onClick={() => setDay(addDays(day, 1))}>
          {t("calendar.nextDay")}
        </button>
        <button type="button" className="button button--quiet" onClick={() => setDay(clubDay(Date.now()))}>
          {t("calendar.today")}
        </button>
        <span className="muted">
          {formatDate(lang, day)} · {t("calendar.hours", { opens: hhmm(opens), closes: hhmm(closes) })}
          {cancelled ? ` · ${t("calendar.cancelledCount", { count: cancelled })}` : ""}
        </span>
      </div>
      {manage ? <p className="muted">{t("calendar.help")}</p> : null}
      <div className="calendar" style={{ gridTemplateColumns: `64px repeat(${columns.length}, minmax(120px, 1fr))` }}>
        <div className="calendar__corner" />
        {columns.map((r) => (
          <div key={r.id} className="calendar__head" role="columnheader">
            {r.name}
          </div>
        ))}
        <div className="calendar__times" aria-hidden="true">
          {slots.map((m) => (
            <div key={m} className="calendar__time" style={{ height: ROW_PX }}>
              {m % 60 === 0 ? hhmm(m) : ""}
            </div>
          ))}
        </div>
        {columns.map((r) => (
          <div key={r.id} className="calendar__column" style={{ height: slots.length * ROW_PX }} aria-label={r.name} role="group">
            {slots.map((m) => {
              const bookable = manage && (BOOKABLE[r.kind]?.length ?? 0) > 0;
              return (
                <button
                  key={m}
                  type="button"
                  className="calendar__cell"
                  style={{ top: ((m - opens) / SLOT) * ROW_PX, height: ROW_PX }}
                  aria-label={t("calendar.freeCell", { resource: r.name, time: hhmm(m) })}
                  disabled={!bookable}
                  onClick={() => {
                    setSelected(null);
                    setDraft({ resource: r, minutes: m });
                  }}
                  onDragOver={(e) => {
                    if (manage) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    drop({ resource: r, minutes: m });
                  }}
                />
              );
            })}
            {live
              .filter((b) => b.resource_id === r.id)
              .map((b) => {
                const start = Math.max(clubMinutes(b.starts_at, day), opens);
                const end = Math.min(clubMinutes(b.ends_at, day), closes);
                return (
                  <button
                    key={b.id}
                    type="button"
                    draggable={manage}
                    className={`calendar__booking calendar__booking--${b.session_type}${b.id === selected ? " is-selected" : ""}`}
                    style={{ top: ((start - opens) / SLOT) * ROW_PX, height: Math.max(1, (end - start) / SLOT) * ROW_PX - 2 }}
                    onClick={() => {
                      setDraft(null);
                      setSelected(b.id);
                    }}
                    onDragStart={(e) => {
                      e.dataTransfer?.setData("text/plain", b.id);
                      setDragged(b.id);
                    }}
                    onDragEnd={() => setDragged(null)}
                  >
                    <span>
                      {formatTime(lang, b.starts_at)}–{formatTime(lang, b.ends_at)}
                    </span>
                    <strong>{b.organizer_name}</strong>
                    <span>{t(`sessionTypes.${b.session_type}`)}</span>
                  </button>
                );
              })}
          </div>
        ))}
      </div>
      {moving ? (
        <MoveConfirm
          booking={moving.booking}
          to={moving.to}
          day={day}
          onDone={async () => {
            setMoving(null);
            await refresh();
          }}
          onCancel={() => setMoving(null)}
        />
      ) : null}
      {draft ? (
        <NewBooking
          cell={draft}
          day={day}
          onDone={async (id) => {
            setDraft(null);
            await refresh();
            setSelected(id);
          }}
          onCancel={() => setDraft(null)}
        />
      ) : null}
      {current ? <Details booking={current} columns={columns} day={day} slots={slots} onChanged={refresh} onClose={() => setSelected(null)} /> : null}
    </section>
  );
}

function MoveConfirm({ booking, to, day, onDone, onCancel }: { booking: Booking; to: Cell; day: string; onDone: () => Promise<void>; onCancel: () => void }) {
  const { api, notify } = usePanel();
  const t = useT();
  return (
    <div className="panel-box" role="region" aria-label={t("calendar.moveTitle")}>
      <h2>{t("calendar.moveTitle")}</h2>
      <p>{t("calendar.moveTo", { name: booking.organizer_name, resource: to.resource.name, time: hhmm(to.minutes) })}</p>
      <ReasonAction
        label={t("calendar.move")}
        onConfirm={async (reason) => {
          await unwrap(
            api.client.POST("/api/v1/staff/bookings/{booking_id}/move", {
              params: { path: { booking_id: booking.id } },
              body: { resource_id: to.resource.id, starts_at: clubMoment(day, to.minutes), reason },
            }),
          );
          notify(t("calendar.moved"));
          await onDone();
        }}
      />
      <button type="button" className="button button--quiet" onClick={onCancel}>
        {t("cancel")}
      </button>
    </div>
  );
}

function NewBooking({ cell, day, onDone, onCancel }: { cell: Cell; day: string; onDone: (id: string) => Promise<void>; onCancel: () => void }) {
  const { api, locationId, lang, notify, fail } = usePanel();
  const t = useT();
  const types = BOOKABLE[cell.resource.kind] ?? [];
  const [customer, setCustomer] = useState<Picked | null>(null);
  const [type, setType] = useState(types[0] ?? "");
  const [minutes, setMinutes] = useState(cell.resource.kind === "reformer" ? 60 : 90);
  const [coach, setCoach] = useState("");
  const coaches = useData(() => unwrap(api.client.GET("/api/v1/staff/panel/coaches", { params: { query: { location_id: locationId } } })), [api, locationId]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!customer) return;
    try {
      const created = await unwrap(
        api.client.POST("/api/v1/staff/bookings", {
          body: {
            resource_id: cell.resource.id,
            starts_at: clubMoment(day, cell.minutes),
            duration_minutes: minutes,
            session_type: type as Schemas["SessionType"],
            for_user_id: customer.id,
            customer_type: "standard",
            coach_id: type === "lesson" && coach ? coach : null,
          },
        }),
      );
      notify(t("calendar.created", { price: formatMoney(lang, created.price_total) }));
      await onDone(created.id);
    } catch (error) {
      fail(error);
    }
  };
  return (
    <form className="panel-box form" onSubmit={(e) => void submit(e)} aria-label={t("calendar.newTitle")}>
      <h2>{t("calendar.newTitle")}</h2>
      <p>
        {cell.resource.name} · {formatDate(lang, day)} · {hhmm(cell.minutes)}
      </p>
      <UserPicker label={t("calendar.customer")} value={customer} onPick={setCustomer} />
      <label>
        {t("calendar.type")}
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {types.map((s) => (
            <option key={s} value={s}>
              {t(`sessionTypes.${s}`)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("calendar.duration")}
        <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
          {DURATIONS.map((d) => (
            <option key={d} value={d}>
              {t("calendar.minutes", { count: d })}
            </option>
          ))}
        </select>
      </label>
      {type === "lesson" ? (
        <label>
          {t("calendar.coach")}
          <select required value={coach} onChange={(e) => setCoach(e.target.value)}>
            <option value="">—</option>
            {(coaches.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="actions">
        <button type="submit" className="button button--primary" disabled={!customer}>
          {t("calendar.book")}
        </button>
        <button type="button" className="button button--quiet" onClick={onCancel}>
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}

function Details({
  booking,
  columns,
  day,
  slots,
  onChanged,
  onClose,
}: {
  booking: Booking;
  columns: Resource[];
  day: string;
  slots: number[];
  onChanged: () => Promise<void>;
  onClose: () => void;
}) {
  const { api, lang, can, notify } = usePanel();
  const t = useT();
  const [resource, setResource] = useState(booking.resource_id);
  const [minutes, setMinutes] = useState(clubMinutes(booking.starts_at, day));
  const [waive, setWaive] = useState(false);
  const same = columns.find((c) => c.id === booking.resource_id)?.kind;
  const open = booking.status === "confirmed";
  return (
    <div className="panel-box" role="region" aria-label={t("calendar.details")}>
      <h2>{booking.organizer_name}</h2>
      <dl className="details">
        <dt>{t("calendar.when")}</dt>
        <dd>
          {formatDate(lang, booking.starts_at)}, {formatTime(lang, booking.starts_at)}–{formatTime(lang, booking.ends_at)}
        </dd>
        <dt>{t("calendar.resource")}</dt>
        <dd>{booking.resource_name}</dd>
        <dt>{t("calendar.type")}</dt>
        <dd>{t(`sessionTypes.${booking.session_type}`)}</dd>
        <dt>{t("calendar.price")}</dt>
        <dd>
          {formatMoney(lang, booking.price_total)}
          {booking.price_provisional ? ` · ${t("calendar.provisional")}` : ""}
        </dd>
        <dt>{t("calendar.status")}</dt>
        <dd>{t(`bookingStatus.${booking.status}`)}</dd>
      </dl>
      <p>
        <a href={`#/users/${booking.organizer_id}`}>{t("calendar.openCustomer")}</a>
      </p>
      {open && can("bookings.manage") ? (
        <div className="actions">
          <ReasonAction
            label={t("calendar.move")}
            onConfirm={async (reason) => {
              await unwrap(
                api.client.POST("/api/v1/staff/bookings/{booking_id}/move", {
                  params: { path: { booking_id: booking.id } },
                  body: { resource_id: resource, starts_at: clubMoment(day, minutes), reason },
                }),
              );
              notify(t("calendar.moved"));
              await onChanged();
            }}
          >
            <label>
              {t("calendar.resource")}
              <select value={resource} onChange={(e) => setResource(e.target.value)}>
                {columns
                  .filter((c) => c.kind === same)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              {t("calendar.start")}
              <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
                {slots.map((m) => (
                  <option key={m} value={m}>
                    {hhmm(m)}
                  </option>
                ))}
              </select>
            </label>
          </ReasonAction>
          <ReasonAction
            danger
            label={t("calendar.cancelBooking")}
            onConfirm={async (reason) => {
              await unwrap(
                api.client.POST("/api/v1/bookings/{booking_id}/cancel", {
                  params: { path: { booking_id: booking.id } },
                  body: { reason, waive },
                }),
              );
              notify(t("calendar.cancelled"));
              await onChanged();
            }}
          >
            <label className="check">
              <input type="checkbox" checked={waive} onChange={(e) => setWaive(e.target.checked)} />
              {t("calendar.waive")}
            </label>
          </ReasonAction>
        </div>
      ) : null}
      <button type="button" className="button button--quiet" onClick={onClose}>
        {t("close")}
      </button>
    </div>
  );
}
