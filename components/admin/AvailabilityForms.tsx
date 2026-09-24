"use client";

import { useFormAction } from "@/components/ui/useFormAction";
import { useState } from "react";
import { addExceptionAction, addRuleAction } from "@/app/actions/admin-availability";

const DAYS = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"];

export function RuleForm() {
  const { state, pending, formProps: actionProps } = useFormAction(addRuleAction);
  return (
    <form {...actionProps} className="admin-form">
      <fieldset>
        <legend>Adaugă un interval disponibil</legend>
        <div className="flex flex-wrap gap-3">
          {DAYS.map((day, i) => (
            <label key={day} className="admin-check">
              <input type="checkbox" name="weekday" value={i + 1} />
              <span>{day}</span>
            </label>
          ))}
        </div>
        <div className="admin-grid-2">
          <label className="field">
            <span className="field-label">De la ora</span>
            <input type="time" name="startTime" required className="input" defaultValue="08:00" />
          </label>
          <label className="field">
            <span className="field-label">Până la ora</span>
            <input type="time" name="endTime" required className="input" defaultValue="12:00" />
          </label>
        </div>
        <details>
          <summary className="cursor-pointer text-note">Doar pentru o perioadă (opțional)</summary>
          <div className="admin-grid-2 mt-3">
            <label className="field">
              <span className="field-label">Valabil de la</span>
              <input type="date" name="validFrom" className="input" />
            </label>
            <label className="field">
              <span className="field-label">Valabil până la</span>
              <input type="date" name="validTo" className="input" />
            </label>
          </div>
        </details>
        {state.status === "error" ? (
          <p role="alert" className="booking-alert">
            {state.error}
          </p>
        ) : null}
        {state.status === "success" ? (
          <p role="status" className="admin-ok">
            Intervalul e adăugat.
          </p>
        ) : null}
        <div>
          <button type="submit" className="btn btn-primary btn-small" disabled={pending}>
            Adaugă intervalul
          </button>
        </div>
      </fieldset>
    </form>
  );
}

export function ExceptionForm() {
  const { state, pending, formProps: actionProps } = useFormAction(addExceptionAction);
  const [allDay, setAllDay] = useState(true);
  return (
    <form {...actionProps} className="admin-form">
      <fieldset>
        <legend>Zi liberă, concediu sau ore în plus</legend>
        <label className="field">
          <span className="field-label">Tip</span>
          <select name="type" className="input" defaultValue="BLOCAT">
            <option value="BLOCAT">Nu sunt disponibil (zi liberă, concediu)</option>
            <option value="DISPONIBIL_EXTRA">Ore în plus, în afara programului</option>
          </select>
        </label>
        <div className="admin-grid-2">
          <label className="field">
            <span className="field-label">Data</span>
            <input type="date" name="date" required className="input" />
          </label>
          <label className="field">
            <span className="field-label">Până la data (pentru concediu, opțional)</span>
            <input type="date" name="dateTo" className="input" />
          </label>
        </div>
        <label className="admin-check">
          <input
            type="checkbox"
            name="allDay"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
          />
          <span>Toată ziua</span>
        </label>
        {!allDay ? (
          <div className="admin-grid-2">
            <label className="field">
              <span className="field-label">De la ora</span>
              <input type="time" name="startTime" className="input" />
            </label>
            <label className="field">
              <span className="field-label">Până la ora</span>
              <input type="time" name="endTime" className="input" />
            </label>
          </div>
        ) : null}
        <label className="field">
          <span className="field-label">Motiv (îl vezi doar tu, opțional)</span>
          <input name="reason" className="input" maxLength={200} />
        </label>
        {state.status === "error" ? (
          <p role="alert" className="booking-alert">
            {state.error}
          </p>
        ) : null}
        {state.status === "success" ? (
          <p role="status" className="admin-ok">
            Excepția e salvată.
          </p>
        ) : null}
        <div>
          <button type="submit" className="btn btn-primary btn-small" disabled={pending}>
            Salvează excepția
          </button>
        </div>
      </fieldset>
    </form>
  );
}
