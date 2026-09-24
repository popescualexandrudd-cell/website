"use client";

import { useFormAction } from "@/components/ui/useFormAction";
import { useState } from "react";
import { createManualBooking } from "@/app/actions/admin-bookings";

type Program = {
  id: string;
  name: string;
  format: string;
  forMinors: boolean;
  maxParticipants: number | null;
};
type Schedule = { id: string; programId: string; label: string };

export function ManualBookingForm({
  programs,
  schedules,
  today,
}: {
  programs: Program[];
  schedules: Schedule[];
  today: string;
}) {
  const { state, pending, formProps: actionProps } = useFormAction(createManualBooking);
  const [programId, setProgramId] = useState(programs[0]?.id ?? "");
  const program = programs.find((p) => p.id === programId);
  const groupSchedules = schedules.filter((s) => s.programId === programId);
  const err = (name: string) => state.fieldErrors?.[name];
  return (
    <form {...actionProps} className="admin-form">
      <fieldset>
        <legend>Lecția</legend>
        <label className="field">
          <span className="field-label">Program</span>
          <select
            name="programId"
            className="input"
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
          >
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {program?.format === "GRUPA" ? (
          <label className="field">
            <span className="field-label">Grupa (ziua și ora trebuie să fie ale unei ședințe)</span>
            <select name="groupScheduleId" className="input">
              {groupSchedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="admin-grid-2">
          <label className="field">
            <span className="field-label">Data</span>
            <input
              type="date"
              name="date"
              required
              defaultValue={today}
              className="input"
              aria-invalid={err("date") ? true : undefined}
            />
          </label>
          <label className="field">
            <span className="field-label">Ora de început</span>
            <input
              type="time"
              name="time"
              required
              step={300}
              defaultValue="10:00"
              className="input"
              aria-invalid={err("time") ? true : undefined}
            />
          </label>
        </div>
        <div className="admin-grid-2">
          <label className="field">
            <span className="field-label">Participanți</span>
            <input
              type="number"
              name="participants"
              min={1}
              max={program?.maxParticipants ?? 1}
              defaultValue={program?.format === "SEMI_PRIVAT" ? 2 : 1}
              className="input"
            />
          </label>
          <label className="field">
            <span className="field-label">Primită prin</span>
            <select name="source" className="input" defaultValue="TELEFON">
              <option value="TELEFON">Telefon</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="ADMIN">Altfel (în persoană)</option>
            </select>
          </label>
        </div>
        <label className="field">
          <span className="field-label">Stare</span>
          <select name="status" className="input" defaultValue="CONFIRMATA">
            <option value="CONFIRMATA">Confirmată</option>
            <option value="IN_ASTEPTARE">În așteptare</option>
          </select>
        </label>
      </fieldset>
      <fieldset>
        <legend>Clientul</legend>
        <label className="field">
          <span className="field-label">{program?.forMinors ? "Numele părintelui" : "Nume"}</span>
          <input
            name="name"
            required
            className="input"
            aria-invalid={err("name") ? true : undefined}
          />
        </label>
        {program?.forMinors ? (
          <div className="admin-grid-2">
            <label className="field">
              <span className="field-label">Prenumele copilului</span>
              <input name="childFirstName" className="input" />
            </label>
            <label className="field">
              <span className="field-label">Vârsta copilului</span>
              <input name="childAge" type="number" min={3} max={17} className="input" />
            </label>
          </div>
        ) : null}
        <div className="admin-grid-2">
          <label className="field">
            <span className="field-label">Telefon</span>
            <input
              name="phone"
              type="tel"
              required
              className="input"
              aria-invalid={err("phone") ? true : undefined}
            />
          </label>
          <label className="field">
            <span className="field-label">Email (opțional)</span>
            <input name="email" type="email" className="input" />
          </label>
        </div>
        <label className="admin-check">
          <input type="checkbox" name="sendEmail" defaultChecked />
          <span>Trimite clientului emailul de confirmare (dacă ai completat emailul)</span>
        </label>
        <label className="field">
          <span className="field-label">Note interne</span>
          <textarea name="internalNotes" rows={3} className="input" />
        </label>
      </fieldset>
      {state.status === "error" ? (
        <p role="alert" className="booking-alert">
          {state.error}
        </p>
      ) : null}
      <div className="admin-sticky-actions">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          Salvează rezervarea
        </button>
      </div>
    </form>
  );
}
