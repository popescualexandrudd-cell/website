"use client";

import { useLocale, useTranslations } from "next-intl";
import { submitCourtRequest } from "@/app/actions/forms";
import { useFormAction } from "@/components/ui/useFormAction";
import { AttributionField, useConversion } from "@/components/ui/Conversion";
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
import { startTimes } from "@/lib/court-hours";

/**
 * Asks for a court: day, time, length and covered or outdoor. The club confirms by phone; the
 * request lands in the admin's inbox and the club's email.
 */
export function CourtRequestForm({
  today,
  open,
  close,
  turnstileSiteKey,
  nonce,
}: {
  /** The club's date today (YYYY-MM-DD), the earliest day that can be asked for. */
  today: string;
  open: string;
  close: string;
  turnstileSiteKey?: string | null;
  nonce?: string;
}) {
  const t = useTranslations("rental");
  const tc = useTranslations("contact");
  const locale = useLocale();
  const errorText = useErrorText();
  const { state, pending, formProps } = useFormAction(submitCourtRequest);
  useConversion(state.status === "success", "court_request");
  if (state.status === "success") return <FormStatus state={state} success={t("success")} />;
  const times = startTimes(open, close);
  return (
    <form {...formProps} className="grid gap-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <Honeypot />
      <AttributionField />
      <div className="booking-fields">
        <TextField
          name="date"
          type="date"
          min={today}
          label={t("date")}
          error={errorText(state.fieldErrors?.date)}
        />
        <SelectField
          name="time"
          label={t("time")}
          defaultValue={times.includes("18:00") ? "18:00" : times[0]}
          error={errorText(state.fieldErrors?.time)}
        >
          {times.map((time) => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </SelectField>
        <SelectField
          name="duration"
          label={t("duration")}
          defaultValue="60"
          error={errorText(state.fieldErrors?.duration)}
        >
          {[60, 90, 120].map((minutes) => (
            <option key={minutes} value={minutes}>
              {t("durationOption", { minutes })}
            </option>
          ))}
        </SelectField>
        <SelectField name="court" label={t("court")} defaultValue="oricare">
          {(["oricare", "acoperit", "exterior"] as const).map((kind) => (
            <option key={kind} value={kind}>
              {t(`courtOptions.${kind}`)}
            </option>
          ))}
        </SelectField>
        <TextField
          name="name"
          autoComplete="name"
          label={tc("name")}
          error={errorText(state.fieldErrors?.name)}
        />
        <TextField
          name="phone"
          type="tel"
          autoComplete="tel"
          label={tc("phoneLabel")}
          error={errorText(state.fieldErrors?.phone)}
        />
        <TextField
          name="email"
          type="email"
          autoComplete="email"
          label={tc("email")}
          error={errorText(state.fieldErrors?.email)}
        />
      </div>
      <TextArea name="message" rows={3} optional label={t("message")} hint={t("messageHint")} />
      <ConsentField error={errorText(state.fieldErrors?.consent)} />
      <Turnstile siteKey={turnstileSiteKey} nonce={nonce} />
      <FormStatus state={state} success={t("success")} />
      <div>
        <SubmitButton pending={pending}>{t("submit")}</SubmitButton>
      </div>
    </form>
  );
}
