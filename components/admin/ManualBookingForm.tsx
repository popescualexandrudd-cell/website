"use client";

import { useFormAction } from "@/components/ui/useFormAction";
import { useState } from "react";
import { createManualBooking } from "@/app/actions/admin-bookings";

type Program = { id: string; name: string };
type Lesson = {
  id: string;
  name: string;
  minParticipants: number;
  maxParticipants: number;
  durations: number[];
};

/** Phone and WhatsApp bookings: programme, kind of lesson, duration, day and time, client. */
export function ManualBookingForm({
  programs,
  lessons,
  today,
}: {
  programs: Program[];
  lessons: Lesson[];
  today: string;
}) {
  const { state, pending, formProps: actionProps } = useFormAction(createManualBooking);
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? "");
  const [forChild, setForChild] = useState(false);
  const lesson = lessons.find((l) => l.id === lessonId);
  const err = (name: string) => state.fieldErrors?.[name];
  return (
    <form {...actionProps} className="admin-form">
      <fieldset>
        <legend>Lecția</legend>
        <div className="admin-grid-2">
          <label className="field">
            <span className="field-label">Program de pregătire</span>
            <select name="programId" className="input" defaultValue={programs[0]?.id}>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Tipul lecției</span>
            <select
              name="lessonTypeId"
              className="input"
              value={lessonId}
              onChange={(e) => setLessonId(e.target.value)}
            >
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-grid-2">
          <label className="field">
            <span className="field-label">Durata (minute)</span>
            <input
              type="number"
              name="durationMin"
              min={15}
              max={600}
              step={5}
              required
              key={lessonId}
              defaultValue={lesson?.durations[0] ?? 60}
              list="durate-uzuale"
              className="input"
              aria-invalid={err("durationMin") ? true : undefined}
            />
            <datalist id="durate-uzuale">
              {(lesson?.durations ?? [60, 90, 120]).map((minutes) => (
                <option key={minutes} value={minutes} />
              ))}
            </datalist>
          </label>
          <label className="field">
            <span className="field-label">
              Participanți
              {lesson && lesson.maxParticipants > lesson.minParticipants
                ? ` (${lesson.minParticipants}–${lesson.maxParticipants})`
                : ""}
            </span>
            <input
              type="number"
              name="participants"
              key={lessonId}
              min={lesson?.minParticipants ?? 1}
              max={lesson?.maxParticipants ?? 1}
              defaultValue={lesson?.minParticipants ?? 1}
              className="input"
              aria-invalid={err("participants") ? true : undefined}
            />
          </label>
        </div>
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
            <span className="field-label">Primită prin</span>
            <select name="source" className="input" defaultValue="TELEFON">
              <option value="TELEFON">Telefon</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="ADMIN">Altfel (în persoană)</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Stare</span>
            <select name="status" className="input" defaultValue="CONFIRMATA">
              <option value="CONFIRMATA">Confirmată</option>
              <option value="IN_ASTEPTARE">În așteptare</option>
            </select>
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Clientul</legend>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={forChild}
            onChange={(e) => setForChild(e.target.checked)}
          />
          <span>Lecția este pentru un copil (datele de contact sunt ale părintelui)</span>
        </label>
        <label className="field">
          <span className="field-label">{forChild ? "Numele părintelui" : "Nume"}</span>
          <input
            name="name"
            required
            className="input"
            aria-invalid={err("name") ? true : undefined}
          />
        </label>
        {forChild ? (
          <div className="admin-grid-2">
            <label className="field">
              <span className="field-label">Prenumele copilului</span>
              <input name="childFirstName" required className="input" />
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
