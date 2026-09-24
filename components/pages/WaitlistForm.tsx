"use client";

import { useFormAction } from "@/components/ui/useFormAction";
import { useLocale, useTranslations } from "next-intl";
import { submitWaitlist } from "@/app/actions/forms";
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

type Props = {
  programs: { id: string; name: string; forMinors: boolean }[];
  initialProgramId?: string | null;
  turnstileSiteKey?: string | null;
  nonce?: string;
};

export function WaitlistForm({ programs, initialProgramId, turnstileSiteKey, nonce }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const errorText = useErrorText();
  const { state, pending, formProps: actionProps } = useFormAction(submitWaitlist);
  if (state.status === "success")
    return <FormStatus state={state} success={t("waitlist.success")} />;
  return (
    <form {...actionProps} className="grid max-w-2xl gap-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <Honeypot />
      <SelectField
        name="programId"
        label={t("waitlist.program")}
        optional
        defaultValue={initialProgramId ?? ""}
      >
        <option value="">{t("waitlist.anyProgram")}</option>
        {programs.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </SelectField>
      <TextArea
        name="preferences"
        rows={2}
        label={t("waitlist.preferences")}
        hint={t("waitlist.preferencesHint")}
        error={errorText(state.fieldErrors?.preferences)}
      />
      <div className="booking-fields">
        <TextField
          name="name"
          autoComplete="name"
          label={t("contact.name")}
          error={errorText(state.fieldErrors?.name)}
        />
        <TextField
          name="email"
          type="email"
          autoComplete="email"
          label={t("contact.email")}
          error={errorText(state.fieldErrors?.email)}
        />
        <TextField
          name="phone"
          type="tel"
          autoComplete="tel"
          label={t("booking.details.phone")}
          error={errorText(state.fieldErrors?.phone)}
        />
        <TextField
          name="childAge"
          type="number"
          inputMode="numeric"
          min={3}
          max={17}
          optional
          label={t("waitlist.childAge")}
          error={errorText(state.fieldErrors?.childAge)}
        />
      </div>
      <TextArea name="message" optional rows={3} label={t("booking.details.message")} />
      <ConsentField error={errorText(state.fieldErrors?.consent)} />
      <Turnstile siteKey={turnstileSiteKey} nonce={nonce} />
      <FormStatus state={state} success={t("waitlist.success")} />
      <div>
        <SubmitButton pending={pending}>{t("waitlist.submit")}</SubmitButton>
      </div>
    </form>
  );
}
