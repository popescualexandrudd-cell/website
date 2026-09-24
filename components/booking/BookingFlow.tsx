"use client";

import { useFormAction } from "@/components/ui/useFormAction";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  fetchAvailability,
  submitBooking,
  type AvailabilityResult,
  type DayOption,
  type SessionOption,
} from "@/app/actions/booking";
import {
  ConsentField,
  FormStatus,
  Honeypot,
  SelectField,
  SubmitButton,
  TextArea,
  TextField,
  Turnstile,
  useErrorText,
} from "@/components/ui/form";

export type BookableProgram = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  format: "INDIVIDUAL" | "SEMI_PRIVAT" | "GRUPA" | "EVENIMENT";
  durationMin: number | null;
  maxParticipants: number | null;
  forMinors: boolean;
  meta: string;
};

type Selection = { start: string; label: string; groupScheduleId?: string };

type Props = {
  programs: BookableProgram[];
  initialProgramId?: string | null;
  bookingMode: "CERERE" | "INSTANT";
  compact?: boolean;
  turnstileSiteKey?: string | null;
  nonce?: string;
};

const COMPACT_SLOTS = 8;
const RETRY_ERRORS = new Set(["conflict", "unavailable", "sessionFull"]);

export function BookingFlow({
  programs,
  initialProgramId,
  bookingMode,
  compact = false,
  turnstileSiteKey,
  nonce,
}: Props) {
  const t = useTranslations("booking");
  const tc = useTranslations("common");
  const locale = useLocale();
  const errorText = useErrorText();
  const [programId, setProgramId] = useState<string | null>(
    initialProgramId ?? (compact ? (programs[0]?.id ?? null) : null),
  );
  const [step, setStep] = useState<1 | 2 | 3>(initialProgramId || compact ? 2 : 1);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [loading, startLoading] = useTransition();
  const { state, pending, formProps: formActionProps } = useFormAction(submitBooking);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const program = useMemo(
    () => programs.find((p) => p.id === programId) ?? null,
    [programs, programId],
  );

  const load = (id: string, fromDate?: string, append = false) => {
    startLoading(async () => {
      try {
        const result = await fetchAvailability({
          programId: id,
          locale,
          fromDate,
          days: compact ? 5 : 7,
        });
        setLoadFailed(false);
        setAvailability((previous) => {
          if (append && previous?.kind === "exclusive" && result.kind === "exclusive") {
            return { ...result, days: [...previous.days, ...result.days] };
          }
          return result;
        });
      } catch {
        setLoadFailed(true);
      }
    });
  };

  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    if (programId && step >= 2) load(programId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, reloadKey]);

  // After a failed submission because the slot was taken, go back and refresh the times.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.status === "error" && state.error && RETRY_ERRORS.has(state.error)) {
      setSelection(null);
      setStep(2);
      setReloadKey((key) => key + 1);
    }
  }

  useEffect(() => {
    if (!compact || step !== 1) headingRef.current?.focus();
  }, [step, compact, state.status]);

  const choose = (selected: Selection) => {
    setSelection(selected);
    setStep(3);
  };

  const submitLabel =
    program?.format === "GRUPA"
      ? t("submitGroup")
      : bookingMode === "INSTANT"
        ? t("submitInstant")
        : t("submitRequest");
  const steps = [t("steps.program"), t("steps.time"), t("steps.details"), t("steps.done")];
  const currentStep = state.status === "success" ? 4 : step;
  const retryError =
    state.status === "error" && state.error && RETRY_ERRORS.has(state.error) ? state.error : null;

  if (state.status === "success" && state.data) {
    const group = state.data.kind === "group";
    const instant = state.data.bookingStatus === "CONFIRMATA";
    const title = group
      ? t("successGroupTitle")
      : instant
        ? t("successInstantTitle")
        : t("successRequestTitle");
    const text = group
      ? t("successGroupText", { code: state.data.code ?? "" })
      : instant
        ? t("successInstantText", { code: state.data.code ?? "" })
        : t("successRequestText", { code: state.data.code ?? "" });
    return (
      <div className="booking-flow" data-compact={compact || undefined}>
        {!compact ? (
          <StepList steps={steps} current={4} label={t("stepOf", { current: 4, total: 4 })} />
        ) : null}
        <div role="status" className="booking-done">
          <h2 ref={headingRef} tabIndex={-1} className="booking-heading">
            {title}
          </h2>
          <p className="mt-3 max-w-prose">{text}</p>
          {state.data.manageUrl ? (
            <p className="mt-6">
              <a href={state.data.manageUrl} className="btn btn-secondary">
                {t("manage")}
              </a>
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="booking-flow" data-compact={compact || undefined}>
      {!compact ? (
        <StepList
          steps={steps}
          current={currentStep}
          label={t("stepOf", { current: currentStep, total: 4 })}
        />
      ) : null}

      {step === 1 && !compact ? (
        <fieldset className="booking-step">
          <legend>
            <h2 ref={headingRef} tabIndex={-1} className="booking-heading">
              {t("chooseProgram")}
            </h2>
          </legend>
          <div className="booking-programs">
            {programs.map((p) => (
              <label key={p.id} className="booking-program">
                <input
                  type="radio"
                  name="program-choice"
                  value={p.id}
                  checked={programId === p.id}
                  onChange={() => setProgramId(p.id)}
                  className="booking-radio"
                />
                <span>
                  <span className="booking-program-name">{p.name}</span>
                  <span className="booking-program-meta">{p.meta}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="booking-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!programId}
              onClick={() => setStep(2)}
            >
              {t("continue")}
            </button>
          </div>
        </fieldset>
      ) : null}

      {step === 2 ? (
        <section className="booking-step" aria-labelledby="booking-time-heading">
          {compact ? (
            <div className="booking-compact-program">
              <label htmlFor="booking-compact-select" className="field-label">
                {t("chooseProgram")}
              </label>
              <select
                id="booking-compact-select"
                className="input"
                value={programId ?? ""}
                onChange={(event) => {
                  setProgramId(event.target.value);
                  setAvailability(null);
                }}
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <h2
            id="booking-time-heading"
            ref={compact ? undefined : headingRef}
            tabIndex={-1}
            className={compact ? "booking-subheading" : "booking-heading"}
          >
            {compact
              ? t("firstFreeTimes")
              : program?.format === "GRUPA"
                ? t("chooseSession")
                : t("chooseTime")}
          </h2>
          {!compact && program ? (
            <p className="booking-selected-program">
              {program.name}
              {" · "}
              <button type="button" className="link" onClick={() => setStep(1)}>
                {t("change")}
              </button>
            </p>
          ) : null}
          {retryError ? (
            <p role="alert" className="booking-alert">
              {t(retryError)}
            </p>
          ) : null}
          <div aria-live="polite" aria-busy={loading}>
            {loadFailed ? <p className="booking-alert">{t("loadError")}</p> : null}
            {!availability && loading ? <p className="text-cerneala-2">{tc("loading")}</p> : null}
            {availability?.kind === "exclusive" ? (
              <ExclusiveSlots
                days={availability.days}
                compact={compact}
                hasMore={availability.hasMore}
                loading={loading}
                emptyText={t("noSlots", { days: availability.horizonDays })}
                onChoose={choose}
                onMore={() => {
                  const last = availability.days[availability.days.length - 1];
                  if (programId && last) load(programId, nextKey(last.date), true);
                }}
                moreLabel={t("moreDays")}
                seeAllHref={program ? program.slug : null}
                seeAllLabel={t("seeAllTimes")}
              />
            ) : null}
            {availability?.kind === "group" ? (
              <GroupSessions
                sessions={availability.sessions}
                compact={compact}
                onChoose={choose}
                emptyText={t("noSessions")}
                waitlistLabel={t("joinWaitlistInstead")}
              />
            ) : null}
            {availability?.kind === "none" ? (
              <p>
                {t("bookingNotOnline")}{" "}
                <Link href="/lista-asteptare" className="link">
                  {t("joinWaitlistInstead")}
                </Link>
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {step === 3 && program && selection ? (
        <form {...formActionProps} className="booking-step booking-form" noValidate>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className={compact ? "booking-subheading" : "booking-heading"}
          >
            {t("steps.details")}
          </h2>
          <div className="booking-summary">
            <p>
              <span className="text-cerneala-2">{t("summary")}: </span>
              {program.name}, {selection.label}
            </p>
            <button type="button" className="link" onClick={() => setStep(2)}>
              {t("change")}
            </button>
          </div>
          <input type="hidden" name="programId" value={program.id} />
          <input type="hidden" name="startsAt" value={selection.start} />
          {selection.groupScheduleId ? (
            <input type="hidden" name="groupScheduleId" value={selection.groupScheduleId} />
          ) : null}
          <input type="hidden" name="locale" value={locale} />
          <Honeypot />
          {program.forMinors ? <p className="field-hint">{t("details.forMinorNote")}</p> : null}
          <div className="booking-fields">
            <TextField
              name="name"
              autoComplete="name"
              label={program.forMinors ? t("details.parentName") : t("details.name")}
              error={errorText(state.fieldErrors?.name)}
            />
            {program.forMinors ? (
              <>
                <TextField
                  name="childFirstName"
                  autoComplete="off"
                  label={t("details.childFirstName")}
                  error={errorText(state.fieldErrors?.childFirstName)}
                />
                <TextField
                  name="childAge"
                  type="number"
                  inputMode="numeric"
                  min={3}
                  max={17}
                  label={t("details.childAge")}
                  error={errorText(state.fieldErrors?.childAge)}
                />
              </>
            ) : null}
            <TextField
              name="email"
              type="email"
              autoComplete="email"
              label={t("details.email")}
              error={errorText(state.fieldErrors?.email)}
            />
            <TextField
              name="phone"
              type="tel"
              autoComplete="tel"
              label={t("details.phone")}
              error={errorText(state.fieldErrors?.phone)}
            />
            {program.format === "SEMI_PRIVAT" ? (
              <SelectField
                name="participants"
                label={t("details.participants")}
                defaultValue="2"
                error={errorText(state.fieldErrors?.participants)}
              >
                {Array.from({ length: program.maxParticipants ?? 2 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </SelectField>
            ) : (
              <input type="hidden" name="participants" value="1" />
            )}
            {!program.forMinors ? (
              <SelectField
                name="declaredLevel"
                label={t("details.level")}
                optional
                defaultValue="INCEPATOR"
              >
                {(["INCEPATOR", "INTERMEDIAR", "AVANSAT", "COMPETITIE"] as const).map((level) => (
                  <option key={level} value={level}>
                    {t(`details.levelOptions.${level}`)}
                  </option>
                ))}
              </SelectField>
            ) : null}
            <TextArea
              name="message"
              optional
              rows={3}
              label={t("details.message")}
              hint={t("details.messageHint")}
              className="booking-fields-wide"
            />
          </div>
          <ConsentField error={errorText(state.fieldErrors?.consent)} />
          <Turnstile siteKey={turnstileSiteKey} nonce={nonce} />
          {state.status === "error" && !retryError ? <FormStatus state={state} success="" /> : null}
          <div className="booking-actions">
            <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
            <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
              {t("back")}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function nextKey(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function StepList({ steps, current, label }: { steps: string[]; current: number; label: string }) {
  return (
    <div className="booking-steps">
      <p className="sr-only" aria-live="polite">
        {label}
      </p>
      <ol aria-label={label}>
        {steps.map((name, i) => (
          <li
            key={name}
            aria-current={i + 1 === current ? "step" : undefined}
            data-done={i + 1 < current || undefined}
          >
            <span className="booking-step-number numerals">{i + 1}</span> {name}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ExclusiveSlots(props: {
  days: DayOption[];
  compact: boolean;
  hasMore: boolean;
  loading: boolean;
  emptyText: string;
  onChoose: (s: Selection) => void;
  onMore: () => void;
  moreLabel: string;
  seeAllHref: string | null;
  seeAllLabel: string;
}) {
  if (props.days.length === 0) return <p>{props.emptyText}</p>;
  if (props.compact) {
    const flat = props.days
      .flatMap((day) => day.slots.map((slot) => ({ ...slot, day: day.label })))
      .slice(0, COMPACT_SLOTS);
    return (
      <div>
        <ul className="slot-list slot-list--compact">
          {flat.map((slot) => (
            <li key={slot.start}>
              <button
                type="button"
                className="slot"
                onClick={() =>
                  props.onChoose({ start: slot.start, label: `${slot.day}, ${slot.label}` })
                }
              >
                <span className="slot-day">{slot.day}</span>
                <span className="slot-time numerals">{slot.label}</span>
              </button>
            </li>
          ))}
        </ul>
        {props.seeAllHref ? (
          <p className="mt-4">
            <Link
              href={{ pathname: "/rezervare", query: { program: props.seeAllHref } }}
              className="link-quiet"
            >
              {props.seeAllLabel}
            </Link>
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <div className="slot-days">
      {props.days.map((day) => (
        <div key={day.date} className="slot-day-group">
          <h3 className="slot-day-heading">{day.label}</h3>
          <ul className="slot-list">
            {day.slots.map((slot) => (
              <li key={slot.start}>
                <button
                  type="button"
                  className="slot"
                  onClick={() =>
                    props.onChoose({ start: slot.start, label: `${day.label}, ${slot.label}` })
                  }
                >
                  <span className="slot-time numerals">{slot.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {props.hasMore ? (
        <p className="mt-6">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={props.onMore}
            disabled={props.loading}
          >
            {props.moreLabel}
          </button>
        </p>
      ) : null}
    </div>
  );
}

function GroupSessions(props: {
  sessions: SessionOption[];
  compact: boolean;
  onChoose: (s: Selection) => void;
  emptyText: string;
  waitlistLabel: string;
}) {
  const t = useTranslations("booking");
  const sessions = props.compact ? props.sessions.slice(0, 6) : props.sessions;
  const open = sessions.filter((s) => s.spotsLeft > 0);
  if (open.length === 0) {
    return (
      <p>
        {props.emptyText}{" "}
        <Link href="/lista-asteptare" className="link">
          {props.waitlistLabel}
        </Link>
      </p>
    );
  }
  return (
    <ul className="session-list">
      {sessions.map((session) => {
        const full = session.spotsLeft <= 0;
        return (
          <li key={`${session.groupScheduleId}-${session.start}`}>
            <button
              type="button"
              className="slot slot--session"
              disabled={full}
              aria-disabled={full}
              onClick={() =>
                props.onChoose({
                  start: session.start,
                  groupScheduleId: session.groupScheduleId,
                  label: `${session.dateLabel}, ${session.timeLabel}`,
                })
              }
            >
              <span className="slot-day">{session.dateLabel}</span>
              <span className="slot-time numerals">{session.timeLabel}</span>
              <span className="slot-spots">
                {full ? t("full") : t("spotsLeft", { count: session.spotsLeft })}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
