"use client";

import { useLocale, useTranslations } from "next-intl";
import { useFormAction } from "@/components/ui/useFormAction";
import { submitEvaluation } from "@/app/actions/forms";
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
  groups: { id: string; name: string }[];
  turnstileSiteKey?: string | null;
  nonce?: string;
};

const EXPERIENCE = ["niciodata", "putin", "regulat", "turnee"] as const;

/** A parent asks for their child's assessment; the academy calls back to agree on a day. */
export function EvaluationForm({ groups, turnstileSiteKey, nonce }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const errorText = useErrorText();
  const { state, pending, formProps } = useFormAction(submitEvaluation);
  if (state.status === "success")
    return <FormStatus state={state} success={t("academy.success")} />;
  return (
    <form {...formProps} className="grid max-w-2xl gap-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <Honeypot />
      <div className="booking-fields">
        <TextField
          name="childFirstName"
          autoComplete="off"
          label={t("academy.childFirstName")}
          error={errorText(state.fieldErrors?.childFirstName)}
        />
        <TextField
          name="childAge"
          type="number"
          inputMode="numeric"
          min={3}
          max={18}
          label={t("academy.childAge")}
          error={errorText(state.fieldErrors?.childAge)}
        />
      </div>
      <SelectField
        name="experience"
        label={t("academy.experience")}
        defaultValue=""
        error={errorText(state.fieldErrors?.experience)}
      >
        <option value="" disabled>
          {t("academy.choose")}
        </option>
        {EXPERIENCE.map((key) => (
          <option key={key} value={key}>
            {t(`academy.experienceOptions.${key}`)}
          </option>
        ))}
      </SelectField>
      {groups.length > 0 ? (
        <SelectField name="groupId" label={t("academy.group")} optional defaultValue="">
          <option value="">{t("academy.groupUnsure")}</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </SelectField>
      ) : null}
      <TextArea
        name="preferences"
        rows={2}
        label={t("academy.preferences")}
        hint={t("academy.preferencesHint")}
        error={errorText(state.fieldErrors?.preferences)}
      />
      <div className="booking-fields">
        <TextField
          name="name"
          autoComplete="name"
          label={t("academy.parentName")}
          error={errorText(state.fieldErrors?.name)}
        />
        <TextField
          name="phone"
          type="tel"
          autoComplete="tel"
          label={t("booking.details.phone")}
          error={errorText(state.fieldErrors?.phone)}
        />
        <TextField
          name="email"
          type="email"
          autoComplete="email"
          label={t("contact.email")}
          error={errorText(state.fieldErrors?.email)}
        />
      </div>
      <TextArea name="message" optional rows={3} label={t("booking.details.message")} />
      <ConsentField error={errorText(state.fieldErrors?.consent)} />
      <Turnstile siteKey={turnstileSiteKey} nonce={nonce} />
      <FormStatus state={state} success={t("academy.success")} />
      <div>
        <SubmitButton pending={pending}>{t("academy.submit")}</SubmitButton>
      </div>
    </form>
  );
}
