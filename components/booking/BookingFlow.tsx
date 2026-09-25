"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useFormAction } from "@/components/ui/useFormAction";
import { AttributionField, useConversion } from "@/components/ui/Conversion";
import {
  fetchAvailability,
  submitBooking,
  type AvailabilityResult,
  type DayOption,
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
import { formatAmount, lessonPrice } from "@/lib/pricing";

/** A training programme offered in the booking flow (Inițiere, Competiție, Amatori). */
export type BookableProgram = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  meta: string;
};

/** A kind of lesson that can be booked online, with its durations and hourly rate. */
export type BookableLesson = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  minParticipants: number;
  maxParticipants: number;
  durations: number[];
  hourlyRate: string | null;
  perPerson: boolean;
};

export type ChosenSlot = { start: string; label: string };

/** What the visitor already chose elsewhere (a programme page, the price list, the home widget). */
export type BookingSelection = {
  programId?: string | null;
  lessonTypeId?: string | null;
  durationMin?: number | null;
  participants?: number | null;
  slot?: ChosenSlot | null;
  /** A gift card code from the card's email (?cod=…). */
  giftCode?: string | null;
};

type Props = {
  programs: BookableProgram[];
  lessons: BookableLesson[];
  initial?: BookingSelection;
  bookingMode: "CERERE" | "INSTANT";
  currency: string;
  /** "Elite Tenis Club, Bulevardul Biruinței 19-21, Pantelimon", shown in the summary. */
  place: string | null;
  /** The home page widget: choose, see the first free times, continue on /rezervare. */
  compact?: boolean;
  turnstileSiteKey?: string | null;
  nonce?: string;
};

type Step = 1 | 2 | 3 | 4 | 5;
const TOTAL_STEPS = 5;

type Details = {
  forWhom: "self" | "child";
  name: string;
  email: string;
  phone: string;
  declaredLevel: string;
  childFirstName: string;
  childAge: string;
  message: string;
  giftCode: string;
};

const EMPTY_DETAILS: Details = {
  forWhom: "self",
  name: "",
  email: "",
  phone: "",
  declaredLevel: "",
  childFirstName: "",
  childAge: "",
  message: "",
  giftCode: "",
};

const DETAIL_FIELDS = new Set([
  "name",
  "email",
  "phone",
  "childFirstName",
  "childAge",
  "message",
  "giftCode",
]);
const RETRY_ERRORS = new Set(["conflict", "unavailable"]);
const COMPACT_SLOTS = 8;
const LEVELS = ["INCEPATOR", "INTERMEDIAR", "AVANSAT", "COMPETITIE"] as const;

/** The same rules the server applies (lib/validation.ts), checked before the last step. */
function validateDetails(d: Details): Record<string, string> {
  const errors: Record<string, string> = {};
  if (d.name.trim().length < 2) errors.name = "name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) errors.email = "email";
  const digits = d.phone.replace(/\D/g, "");
  if (!/^\+?[\d\s().-]{8,}$/.test(d.phone.trim()) || digits.length < 8 || digits.length > 15)
    errors.phone = "phone";
  if (d.forWhom === "child") {
    if (!d.childFirstName.trim()) errors.childFirstName = "childFirstName";
    const age = Number(d.childAge);
    if (!Number.isInteger(age) || age < 3 || age > 17) errors.childAge = "childAge";
  }
  return errors;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function nextDateKey(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Chosen duration if the lesson offers it, otherwise its shortest one. */
function effectiveDuration(lesson: BookableLesson | null, wanted: number | null | undefined) {
  if (!lesson) return null;
  if (wanted && lesson.durations.includes(wanted)) return wanted;
  return lesson.durations[0] ?? 60;
}

function firstStep(
  programs: BookableProgram[],
  lessons: BookableLesson[],
  initial?: BookingSelection,
): Step {
  const program = programs.find((p) => p.id === initial?.programId);
  const lesson = lessons.find((l) => l.id === initial?.lessonTypeId);
  if (!program) return 1;
  if (!lesson || !initial?.durationMin) return 2;
  if (!initial.slot) return 3;
  return 4;
}

/**
 * Booking in five steps: programme → lesson and duration → day and time → my details →
 * confirmation. Every choice stays editable until the booking is sent; the server checks the
 * time again when it saves, so two people can never take the same hour.
 */
export function BookingFlow(props: Props) {
  // A new booking after a successful one starts from a clean form (and a fresh action state).
  const [round, setRound] = useState(0);
  if (props.compact) return <CompactFlow {...props} />;
  return (
    <FullFlow
      key={round}
      {...props}
      initial={round === 0 ? props.initial : undefined}
      onRestart={() => setRound((r) => r + 1)}
    />
  );
}

// ─── Full flow (/rezervare) ──────────────────────────────────────────────────

function FullFlow({
  programs,
  lessons,
  initial,
  bookingMode,
  currency,
  place,
  turnstileSiteKey,
  nonce,
  onRestart,
}: Props & { onRestart: () => void }) {
  const t = useTranslations("booking");
  const tc = useTranslations("common");
  const locale = useLocale();
  const errorText = useErrorText();

  const [programId, setProgramId] = useState<string | null>(initial?.programId ?? null);
  const [lessonId, setLessonId] = useState<string | null>(initial?.lessonTypeId ?? null);
  const [wantedDuration, setWantedDuration] = useState<number | null>(initial?.durationMin ?? null);
  const [wantedParticipants, setWantedParticipants] = useState<number | null>(
    initial?.participants ?? null,
  );
  const [slot, setSlot] = useState<ChosenSlot | null>(initial?.slot ?? null);
  const [details, setDetails] = useState<Details>(() => ({
    ...EMPTY_DETAILS,
    giftCode: initial?.giftCode ?? "",
  }));
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [choiceError, setChoiceError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(() => firstStep(programs, lessons, initial));

  /** Changes one detail and clears its error, so a corrected field stops showing red at once. */
  const edit = <K extends keyof Details>(key: K, value: Details[K]) => {
    setDetails((d) => ({ ...d, [key]: value }));
    setDetailErrors((errors) => {
      if (!(key in errors)) return errors;
      const rest = { ...errors };
      delete rest[key];
      return rest;
    });
  };

  const program = programs.find((p) => p.id === programId) ?? null;
  const lesson = lessons.find((l) => l.id === lessonId) ?? null;
  const duration = effectiveDuration(lesson, wantedDuration);
  const persons = lesson
    ? clamp(
        wantedParticipants ?? lesson.minParticipants,
        lesson.minParticipants,
        lesson.maxParticipants,
      )
    : 1;
  const price =
    lesson && duration
      ? lessonPrice(lesson.hourlyRate, duration, lesson.perPerson ? persons : 1)
      : null;

  // ── Availability for the chosen lesson and duration ──
  const [availability, setAvailability] = useState<{
    key: string;
    result: AvailabilityResult;
  } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, startLoading] = useTransition();
  const [reloadCount, setReloadCount] = useState(0);
  const loadedFor = useRef<string | null>(null);
  const availabilityKey = lesson && duration ? `${lesson.id}:${duration}` : null;

  const load = (key: string, lessonTypeId: string, durationMin: number, fromDate?: string) => {
    startLoading(async () => {
      try {
        const result = await fetchAvailability({
          lessonTypeId,
          durationMin,
          locale,
          fromDate,
          days: 7,
        });
        setLoadFailed(false);
        setAvailability((previous) => {
          if (
            fromDate &&
            previous?.key === key &&
            previous.result.kind === "slots" &&
            result.kind === "slots"
          ) {
            return { key, result: { ...result, days: [...previous.result.days, ...result.days] } };
          }
          return { key, result };
        });
      } catch {
        setLoadFailed(true);
      }
    });
  };

  useEffect(() => {
    if (step !== 3 || !lesson || !duration || !availabilityKey) return;
    const wanted = `${availabilityKey}#${reloadCount}`;
    if (loadedFor.current === wanted) return;
    loadedFor.current = wanted;
    load(availabilityKey, lesson.id, duration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, availabilityKey, reloadCount]);

  // ── Submission ──
  const { state, pending, formProps } = useFormAction(submitBooking);
  useConversion(state.status === "success", "booking_request");
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.status === "error") {
      const fieldErrors = state.fieldErrors ?? {};
      const detailKeys = Object.keys(fieldErrors).filter((key) => DETAIL_FIELDS.has(key));
      if (state.error && RETRY_ERRORS.has(state.error)) {
        setNotice(state.error);
        setSlot(null);
        setStep(3);
        setReloadCount((n) => n + 1);
      } else if (detailKeys.length > 0) {
        setDetailErrors(
          Object.fromEntries(detailKeys.map((key) => [key, fieldErrors[key] ?? key])),
        );
        setStep(4);
      } else if (state.error === "program") {
        setNotice("program");
        setStep(1);
      } else if (state.error && ["lessonType", "duration", "participants"].includes(state.error)) {
        setNotice(state.error);
        setStep(2);
      }
    }
  }

  // ── Moving between steps: bring the new step into view and move focus to its heading ──
  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);
  const done = state.status === "success" && Boolean(state.data);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
    const root = rootRef.current;
    if (!root) return;
    const top = root.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * 0.35) {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      root.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    }
  }, [step, done]);

  const goTo = (next: Step) => {
    setChoiceError(null);
    if (next > step) setNotice(null);
    setStep(next);
  };

  const steps = [
    t("steps.program"),
    t("steps.lesson"),
    t("steps.time"),
    t("steps.details"),
    t("steps.confirm"),
  ];

  if (done && state.data) {
    const instant = state.data.bookingStatus === "CONFIRMATA";
    const values = { code: state.data.code ?? "", email: state.data.email ?? details.email };
    return (
      <div ref={rootRef} className="booking-flow">
        <StepList
          steps={steps}
          current={TOTAL_STEPS + 1}
          label={t("stepOf", { current: TOTAL_STEPS, total: TOTAL_STEPS })}
        />
        <div role="status" className="booking-done">
          <h2 ref={headingRef} tabIndex={-1} className="booking-heading">
            {instant ? t("successInstantTitle") : t("successRequestTitle")}
          </h2>
          <p className="mt-3 max-w-prose">
            {instant ? t("successInstantText", values) : t("successRequestText", values)}
          </p>
          <div className="booking-actions mt-6">
            {state.data.manageUrl ? (
              <a href={state.data.manageUrl} className="btn btn-primary">
                {t("manage")}
              </a>
            ) : null}
            <button type="button" className="btn btn-secondary" onClick={onRestart}>
              {t("newBooking")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (programs.length === 0 || lessons.length === 0) {
    return (
      <p className="booking-alert" role="status">
        {t("noPrograms")}
      </p>
    );
  }

  const noticeText = notice
    ? RETRY_ERRORS.has(notice)
      ? t(notice as "conflict" | "unavailable")
      : errorText(notice)
    : null;
  const lessonLine =
    lesson && duration
      ? t("timeFor", { lesson: lesson.name, duration: t("durationOption", { minutes: duration }) })
      : "";

  return (
    <div ref={rootRef} className="booking-flow">
      <StepList
        steps={steps}
        current={step}
        label={t("stepOf", { current: step, total: TOTAL_STEPS })}
        onGo={(target) => goTo(target as Step)}
      />

      {noticeText && step < 5 ? (
        <p role="alert" className="booking-alert">
          {noticeText}
        </p>
      ) : null}

      {step === 1 ? (
        <form
          className="booking-step"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!program) setChoiceError(t("chooseProgramError"));
            else goTo(2);
          }}
        >
          <fieldset className="booking-step">
            <legend>
              <h2 ref={headingRef} tabIndex={-1} className="booking-heading">
                {t("chooseProgram")}
              </h2>
              <p className="booking-lead">{t("chooseProgramHint")}</p>
            </legend>
            <div className="booking-options">
              {programs.map((p) => (
                <label key={p.id} className="booking-option">
                  <input
                    type="radio"
                    name="program-choice"
                    value={p.id}
                    checked={programId === p.id}
                    onChange={() => {
                      setProgramId(p.id);
                      setChoiceError(null);
                    }}
                    className="booking-radio"
                  />
                  <span>
                    <span className="booking-option-name">{p.name}</span>
                    {p.meta ? <span className="booking-option-meta">{p.meta}</span> : null}
                    <span className="booking-option-text">{p.summary}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {choiceError ? (
            <p role="alert" className="field-error">
              {choiceError}
            </p>
          ) : null}
          <div className="booking-actions">
            <button type="submit" className="btn btn-primary">
              {t("continue")}
            </button>
          </div>
        </form>
      ) : null}

      {step === 2 ? (
        <form
          className="booking-step"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!lesson || !duration) setChoiceError(t("chooseLessonError"));
            else {
              setWantedDuration(duration);
              setWantedParticipants(persons);
              // Changing the lesson or the duration clears the time; the number of people does not.
              goTo(slot ? 4 : 3);
            }
          }}
        >
          <fieldset className="booking-step">
            <legend>
              <h2 ref={headingRef} tabIndex={-1} className="booking-heading">
                {t("chooseLesson")}
              </h2>
              {program ? (
                <p className="booking-lead">
                  {t("forProgram", { program: program.name })}{" "}
                  <button type="button" className="link" onClick={() => goTo(1)}>
                    {t("change")}
                  </button>
                </p>
              ) : null}
            </legend>
            <div className="booking-options booking-options--grid">
              {lessons.map((l) => (
                <label key={l.id} className="booking-option">
                  <input
                    type="radio"
                    name="lesson-choice"
                    value={l.id}
                    checked={lessonId === l.id}
                    onChange={() => {
                      setLessonId(l.id);
                      setSlot(null);
                      setChoiceError(null);
                    }}
                    className="booking-radio"
                  />
                  <span>
                    <span className="booking-option-name">{l.name}</span>
                    <span className="booking-option-meta">
                      <LessonMeta lesson={l} currency={currency} />
                    </span>
                    <span className="booking-option-text">{l.summary}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {lesson && duration ? (
            <div className="booking-choices">
              <SelectField
                name="duration-choice"
                label={t("duration")}
                hint={t("durationHint")}
                value={String(duration)}
                onChange={(event) => {
                  setWantedDuration(Number(event.target.value));
                  setSlot(null);
                }}
              >
                {lesson.durations.map((minutes) => {
                  const amount = lessonPrice(
                    lesson.hourlyRate,
                    minutes,
                    lesson.perPerson ? persons : 1,
                  );
                  return (
                    <option key={minutes} value={minutes}>
                      {t("durationOption", { minutes })}
                      {amount !== null ? ` · ${formatAmount(amount, currency, locale)}` : ""}
                    </option>
                  );
                })}
              </SelectField>
              {lesson.maxParticipants > lesson.minParticipants ? (
                <SelectField
                  name="participants-choice"
                  label={t("participants")}
                  value={String(persons)}
                  onChange={(event) => setWantedParticipants(Number(event.target.value))}
                >
                  {Array.from(
                    { length: lesson.maxParticipants - lesson.minParticipants + 1 },
                    (_, i) => lesson.minParticipants + i,
                  ).map((count) => (
                    <option key={count} value={count}>
                      {t("persons", { count })}
                    </option>
                  ))}
                </SelectField>
              ) : null}
              {price !== null ? (
                <p className="booking-price booking-fields-wide">
                  <span>{t("estimatedPrice")}: </span>
                  <strong className="numerals">{formatAmount(price, currency, locale)}</strong>
                  <span className="booking-price-note">{t("priceNote")}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          {choiceError ? (
            <p role="alert" className="field-error">
              {choiceError}
            </p>
          ) : null}
          <div className="booking-actions">
            <button type="submit" className="btn btn-primary">
              {t("continue")}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => goTo(1)}>
              {t("back")}
            </button>
          </div>
        </form>
      ) : null}

      {step === 3 && lesson && duration ? (
        <section className="booking-step" aria-labelledby="booking-time-heading">
          <div>
            <h2
              id="booking-time-heading"
              ref={headingRef}
              tabIndex={-1}
              className="booking-heading"
            >
              {t("chooseTime")}
            </h2>
            <p className="booking-lead">
              {lessonLine}
              {persons > 1 ? `, ${t("persons", { count: persons })}` : ""}{" "}
              <button type="button" className="link" onClick={() => goTo(2)}>
                {t("change")}
              </button>
            </p>
          </div>
          <div aria-live="polite" aria-busy={loading}>
            {loadFailed ? <p className="booking-alert">{t("loadError")}</p> : null}
            {(!availability || availability.key !== availabilityKey) && loading ? (
              <p className="text-cerneala-2">{tc("loading")}</p>
            ) : null}
            {availability?.key === availabilityKey && availability.result.kind === "slots" ? (
              <SlotDays
                days={availability.result.days}
                selected={slot?.start ?? null}
                emptyText={t("noSlots", { days: availability.result.horizonDays })}
                hasMore={availability.result.hasMore}
                loading={loading}
                moreLabel={t("moreDays")}
                onMore={() => {
                  const last =
                    availability.result.kind === "slots" ? availability.result.days.at(-1) : null;
                  if (last && availabilityKey)
                    load(availabilityKey, lesson.id, duration, nextDateKey(last.date));
                }}
                onChoose={(chosen) => {
                  setSlot(chosen);
                  goTo(4);
                }}
              />
            ) : null}
            {availability?.key === availabilityKey && availability.result.kind === "none" ? (
              <p>
                {t("bookingNotOnline")}{" "}
                <Link href="/contact" className="link">
                  {t("contactInstead")}
                </Link>
              </p>
            ) : null}
          </div>
          <div className="booking-actions">
            <button type="button" className="btn btn-secondary" onClick={() => goTo(2)}>
              {t("back")}
            </button>
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <form
          className="booking-step"
          noValidate
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const errors = validateDetails(details);
            setDetailErrors(errors);
            if (Object.keys(errors).length > 0) {
              const form = event.currentTarget;
              requestAnimationFrame(() =>
                form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
              );
              return;
            }
            goTo(5);
          }}
        >
          <div>
            <h2 ref={headingRef} tabIndex={-1} className="booking-heading">
              {t("detailsTitle")}
            </h2>
            {slot ? (
              <p className="booking-lead">
                {slot.label} · {lessonLine}{" "}
                <button type="button" className="link" onClick={() => goTo(3)}>
                  {t("change")}
                </button>
              </p>
            ) : null}
          </div>
          <fieldset className="booking-for-whom">
            <legend className="field-label">{t("forWhom")}</legend>
            <div className="booking-toggle">
              {(["self", "child"] as const).map((value) => (
                <label key={value} className="booking-toggle-option">
                  <input
                    type="radio"
                    name="for-whom"
                    value={value}
                    checked={details.forWhom === value}
                    onChange={() => edit("forWhom", value)}
                    className="booking-radio"
                  />
                  {value === "self" ? t("forSelf") : t("forChild")}
                </label>
              ))}
            </div>
            {details.forWhom === "child" ? (
              <p className="field-hint">{t("details.forMinorNote")}</p>
            ) : null}
          </fieldset>
          {Object.keys(detailErrors).length > 0 ? (
            <p role="alert" className="booking-alert">
              {t("fixFields")}
            </p>
          ) : null}
          <div className="booking-fields">
            <TextField
              name="name"
              autoComplete="name"
              label={details.forWhom === "child" ? t("details.parentName") : t("details.name")}
              value={details.name}
              onChange={(event) => edit("name", event.target.value)}
              error={errorText(detailErrors.name)}
            />
            {details.forWhom === "child" ? (
              <>
                <TextField
                  name="childFirstName"
                  autoComplete="off"
                  label={t("details.childFirstName")}
                  value={details.childFirstName}
                  onChange={(event) => edit("childFirstName", event.target.value)}
                  error={errorText(detailErrors.childFirstName)}
                />
                <TextField
                  name="childAge"
                  type="number"
                  inputMode="numeric"
                  min={3}
                  max={17}
                  label={t("details.childAge")}
                  value={details.childAge}
                  onChange={(event) => edit("childAge", event.target.value)}
                  error={errorText(detailErrors.childAge)}
                />
              </>
            ) : null}
            <TextField
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              label={t("details.email")}
              hint={t("details.emailHint")}
              value={details.email}
              onChange={(event) => edit("email", event.target.value)}
              error={errorText(detailErrors.email)}
            />
            <TextField
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              label={t("details.phone")}
              value={details.phone}
              onChange={(event) => edit("phone", event.target.value)}
              error={errorText(detailErrors.phone)}
            />
            {details.forWhom === "self" ? (
              <SelectField
                name="declaredLevel"
                label={t("details.level")}
                optional
                value={details.declaredLevel}
                onChange={(event) => edit("declaredLevel", event.target.value)}
              >
                <option value="">{t("details.levelUnset")}</option>
                {LEVELS.map((level) => (
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
              maxLength={2000}
              label={t("details.message")}
              hint={t("details.messageHint")}
              className="booking-fields-wide"
              value={details.message}
              onChange={(event) => edit("message", event.target.value)}
            />
            <TextField
              name="giftCode"
              optional
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={40}
              label={t("details.giftCode")}
              hint={t("details.giftCodeHint")}
              value={details.giftCode}
              onChange={(event) => edit("giftCode", event.target.value)}
              error={errorText(detailErrors.giftCode)}
            />
          </div>
          <div className="booking-actions">
            <button type="submit" className="btn btn-primary">
              {t("toConfirm")}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => goTo(3)}>
              {t("back")}
            </button>
          </div>
        </form>
      ) : null}

      {step === 5 && program && lesson && duration && slot ? (
        <form {...formProps} className="booking-step" noValidate>
          <div>
            <h2 ref={headingRef} tabIndex={-1} className="booking-heading">
              {t("confirmTitle")}
            </h2>
            <p className="booking-lead">{t("confirmIntro")}</p>
          </div>
          <dl className="booking-review">
            <ReviewRow
              label={t("summary.program")}
              onChange={() => goTo(1)}
              changeLabel={t("change")}
            >
              {program.name}
            </ReviewRow>
            <ReviewRow
              label={t("summary.lesson")}
              onChange={() => goTo(2)}
              changeLabel={t("change")}
            >
              {lesson.name}
              {lesson.maxParticipants > 1 ? `, ${t("persons", { count: persons })}` : ""}
            </ReviewRow>
            <ReviewRow
              label={t("summary.duration")}
              onChange={() => goTo(2)}
              changeLabel={t("change")}
            >
              {t("durationOption", { minutes: duration })}
            </ReviewRow>
            <ReviewRow label={t("summary.when")} onChange={() => goTo(3)} changeLabel={t("change")}>
              <span className="booking-review-when">{slot.label}</span>
            </ReviewRow>
            {place ? <ReviewRow label={t("summary.where")}>{place}</ReviewRow> : null}
            <ReviewRow
              label={t("summary.contact")}
              onChange={() => goTo(4)}
              changeLabel={t("change")}
            >
              {details.name}
              <br />
              {details.email}
              <br />
              {details.phone}
            </ReviewRow>
            {details.forWhom === "child" ? (
              <ReviewRow
                label={t("summary.child")}
                onChange={() => goTo(4)}
                changeLabel={t("change")}
              >
                {t("childSummary", { name: details.childFirstName, age: details.childAge })}
              </ReviewRow>
            ) : null}
            {details.giftCode.trim() ? (
              <ReviewRow
                label={t("summary.giftCode")}
                onChange={() => goTo(4)}
                changeLabel={t("change")}
              >
                <span className="numerals">{details.giftCode.trim().toUpperCase()}</span>
              </ReviewRow>
            ) : null}
            {price !== null ? (
              <ReviewRow label={t("estimatedPrice")}>
                <strong className="numerals">{formatAmount(price, currency, locale)}</strong>
                <span className="booking-price-note">{t("priceNote")}</span>
              </ReviewRow>
            ) : null}
          </dl>

          <input type="hidden" name="programId" value={program.id} />
          <input type="hidden" name="lessonTypeId" value={lesson.id} />
          <input type="hidden" name="durationMin" value={duration} />
          <input type="hidden" name="participants" value={persons} />
          <input type="hidden" name="startsAt" value={slot.start} />
          <input type="hidden" name="forWhom" value={details.forWhom} />
          <input type="hidden" name="name" value={details.name} />
          <input type="hidden" name="email" value={details.email} />
          <input type="hidden" name="phone" value={details.phone} />
          <input type="hidden" name="message" value={details.message} />
          {details.giftCode.trim() ? (
            <input type="hidden" name="giftCode" value={details.giftCode} />
          ) : null}
          {details.forWhom === "self" && details.declaredLevel ? (
            <input type="hidden" name="declaredLevel" value={details.declaredLevel} />
          ) : null}
          {details.forWhom === "child" ? (
            <>
              <input type="hidden" name="childFirstName" value={details.childFirstName} />
              <input type="hidden" name="childAge" value={details.childAge} />
            </>
          ) : null}
          <input type="hidden" name="locale" value={locale} />
          <Honeypot />
          <AttributionField />

          <p className="field-hint">{t("emailNote", { email: details.email })}</p>
          <ConsentField error={errorText(state.fieldErrors?.consent)} />
          <Turnstile siteKey={turnstileSiteKey} nonce={nonce} />
          {state.status === "error" && state.error && !RETRY_ERRORS.has(state.error) ? (
            <FormStatus state={state} success="" />
          ) : null}
          <div className="booking-actions">
            <SubmitButton pending={pending}>
              {bookingMode === "INSTANT" ? t("submitInstant") : t("submitRequest")}
            </SubmitButton>
            <button type="button" className="btn btn-secondary" onClick={() => goTo(4)}>
              {t("back")}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function LessonMeta({ lesson, currency }: { lesson: BookableLesson; currency: string }) {
  const t = useTranslations("booking");
  const locale = useLocale();
  const people =
    lesson.minParticipants === lesson.maxParticipants
      ? t("persons", { count: lesson.minParticipants })
      : t("personsRange", { min: lesson.minParticipants, max: lesson.maxParticipants });
  const hourly = lessonPrice(lesson.hourlyRate, 60);
  const rate =
    hourly === null
      ? null
      : lesson.perPerson
        ? t("perHourPerson", { price: formatAmount(hourly, currency, locale) })
        : t("perHour", { price: formatAmount(hourly, currency, locale) });
  return <>{rate ? `${people} · ${rate}` : people}</>;
}

function ReviewRow({
  label,
  children,
  onChange,
  changeLabel,
}: {
  label: string;
  children: ReactNode;
  onChange?: () => void;
  changeLabel?: string;
}) {
  return (
    <div className="booking-review-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
      {onChange ? (
        <dd className="booking-review-edit">
          <button type="button" className="link" onClick={onChange}>
            {changeLabel}
            <span className="sr-only">: {label}</span>
          </button>
        </dd>
      ) : null}
    </div>
  );
}

function StepList({
  steps,
  current,
  label,
  onGo,
}: {
  steps: string[];
  current: number;
  label: string;
  onGo?: (step: number) => void;
}) {
  return (
    <div className="booking-steps">
      <p className="sr-only" aria-live="polite">
        {label}
      </p>
      <ol aria-label={label}>
        {steps.map((name, i) => {
          const number = i + 1;
          const isDone = number < current;
          const content = (
            <>
              <span className="booking-step-number numerals">{number}</span>
              <span className="booking-step-name">{name}</span>
            </>
          );
          return (
            <li
              key={name}
              aria-current={number === current ? "step" : undefined}
              data-done={isDone || undefined}
            >
              {isDone && onGo ? (
                <button type="button" className="booking-step-link" onClick={() => onGo(number)}>
                  {content}
                </button>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function SlotDays(props: {
  days: DayOption[];
  selected: string | null;
  emptyText: string;
  hasMore: boolean;
  loading: boolean;
  moreLabel: string;
  onMore: () => void;
  onChoose: (slot: ChosenSlot) => void;
}) {
  if (props.days.length === 0) return <p>{props.emptyText}</p>;
  return (
    <div className="slot-days">
      {props.days.map((day) => (
        <div key={day.date} className="slot-day-group">
          <h3 className="slot-day-heading">{day.label}</h3>
          <ul className="slot-list">
            {day.slots.map((s) => (
              <li key={s.start}>
                <button
                  type="button"
                  className="slot"
                  aria-pressed={props.selected === s.start}
                  onClick={() =>
                    props.onChoose({ start: s.start, label: `${day.label}, ${s.label}` })
                  }
                >
                  <span className="slot-time numerals">{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {props.hasMore ? (
        <p>
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

// ─── Compact widget (home page) ──────────────────────────────────────────────

/**
 * The home page widget: three dropdowns (programme, lesson, duration) and the first free times.
 * Choosing a time continues on /rezervare at "My details", with everything already filled in.
 */
function CompactFlow({ programs, lessons, currency }: Props) {
  const t = useTranslations("booking");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [programId, setProgramId] = useState(programs[0]?.id ?? "");
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? "");
  const [wantedDuration, setWantedDuration] = useState<number | null>(null);
  const [wantedParticipants, setWantedParticipants] = useState<number | null>(null);
  const [availability, setAvailability] = useState<{
    key: string;
    result: AvailabilityResult;
  } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, startLoading] = useTransition();

  const program = programs.find((p) => p.id === programId) ?? null;
  const lesson = lessons.find((l) => l.id === lessonId) ?? null;
  const duration = effectiveDuration(lesson, wantedDuration);
  const persons = lesson
    ? clamp(
        wantedParticipants ?? lesson.minParticipants,
        lesson.minParticipants,
        lesson.maxParticipants,
      )
    : 1;
  const key = lesson && duration ? `${lesson.id}:${duration}` : null;

  useEffect(() => {
    if (!key || !lesson || !duration) return;
    startLoading(async () => {
      try {
        const result = await fetchAvailability({
          lessonTypeId: lesson.id,
          durationMin: duration,
          locale,
          days: 5,
        });
        setLoadFailed(false);
        setAvailability({ key, result });
      } catch {
        setLoadFailed(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!program || !lesson || !duration) {
    return <p className="booking-alert">{t("noPrograms")}</p>;
  }

  const query = {
    program: program.slug,
    tip: lesson.slug,
    durata: String(duration),
    ...(lesson.maxParticipants > 1 ? { participanti: String(persons) } : {}),
  };
  const current = availability?.key === key ? availability.result : null;
  const flat =
    current?.kind === "slots"
      ? current.days
          .flatMap((day) => day.slots.map((s) => ({ ...s, day: day.label })))
          .slice(0, COMPACT_SLOTS)
      : [];

  return (
    <div className="booking-flow booking-flow--compact">
      <div className="booking-compact-choices">
        <SelectField
          name="compact-program"
          label={t("steps.program")}
          value={programId}
          onChange={(event) => setProgramId(event.target.value)}
        >
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          name="compact-lesson"
          label={t("steps.lesson")}
          value={lessonId}
          onChange={(event) => setLessonId(event.target.value)}
        >
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          name="compact-duration"
          label={t("duration")}
          value={String(duration)}
          onChange={(event) => setWantedDuration(Number(event.target.value))}
        >
          {lesson.durations.map((minutes) => (
            <option key={minutes} value={minutes}>
              {t("durationOption", { minutes })}
            </option>
          ))}
        </SelectField>
        {lesson.maxParticipants > lesson.minParticipants ? (
          <SelectField
            name="compact-participants"
            label={t("participants")}
            value={String(persons)}
            onChange={(event) => setWantedParticipants(Number(event.target.value))}
          >
            {Array.from(
              { length: lesson.maxParticipants - lesson.minParticipants + 1 },
              (_, i) => lesson.minParticipants + i,
            ).map((count) => (
              <option key={count} value={count}>
                {t("persons", { count })}
              </option>
            ))}
          </SelectField>
        ) : null}
      </div>
      <p className="booking-compact-rate">
        <LessonMeta lesson={lesson} currency={currency} />
      </p>

      <div aria-live="polite" aria-busy={loading}>
        <h3 className="booking-subheading">{t("firstFreeTimes")}</h3>
        {loadFailed ? <p className="booking-alert">{t("loadError")}</p> : null}
        {!current && loading ? <p className="text-cerneala-2">{tc("loading")}</p> : null}
        {current?.kind === "slots" && flat.length === 0 ? (
          <p>{t("noSlots", { days: current.horizonDays })}</p>
        ) : null}
        {current?.kind === "none" ? <p>{t("bookingNotOnline")}</p> : null}
        {flat.length > 0 ? (
          <>
            <p className="field-hint">{t("compactHint")}</p>
            <ul className="slot-list slot-list--compact">
              {flat.map((s) => (
                <li key={s.start}>
                  <button
                    type="button"
                    className="slot"
                    onClick={() =>
                      router.push({ pathname: "/rezervare", query: { ...query, ora: s.start } })
                    }
                  >
                    <span className="slot-day">{s.day}</span>
                    <span className="slot-time numerals">{s.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
      <p>
        <Link href={{ pathname: "/rezervare", query }} className="link-quiet">
          {t("seeAllTimes")}
        </Link>
      </p>
    </div>
  );
}
