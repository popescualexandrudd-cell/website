"use client";

import { useFormAction } from "@/components/ui/useFormAction";
import { AttributionField, useConversion } from "@/components/ui/Conversion";
import { useLocale, useTranslations } from "next-intl";
import { submitContact } from "@/app/actions/forms";
import {
  ConsentField,
  FormStatus,
  Honeypot,
  SubmitButton,
  TextArea,
  TextField,
  Turnstile,
  useErrorText,
} from "@/components/ui/form";

export function ContactForm({
  turnstileSiteKey,
  nonce,
}: {
  turnstileSiteKey?: string | null;
  nonce?: string;
}) {
  const t = useTranslations("contact");
  const locale = useLocale();
  const errorText = useErrorText();
  const { state, pending, formProps: actionProps } = useFormAction(submitContact);
  useConversion(state.status === "success", "contact_message");
  if (state.status === "success") return <FormStatus state={state} success={t("success")} />;
  return (
    <form {...actionProps} className="grid gap-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <Honeypot />
      <AttributionField />
      <div className="booking-fields">
        <TextField
          name="name"
          autoComplete="name"
          label={t("name")}
          error={errorText(state.fieldErrors?.name)}
        />
        <TextField
          name="email"
          type="email"
          autoComplete="email"
          label={t("email")}
          error={errorText(state.fieldErrors?.email)}
        />
        <TextField
          name="phone"
          type="tel"
          autoComplete="tel"
          optional
          label={t("phone")}
          error={errorText(state.fieldErrors?.phone)}
        />
        <TextField name="subject" optional label={t("subject")} />
      </div>
      <TextArea
        name="message"
        rows={6}
        label={t("message")}
        error={errorText(state.fieldErrors?.message)}
      />
      <ConsentField error={errorText(state.fieldErrors?.consent)} />
      <Turnstile siteKey={turnstileSiteKey} nonce={nonce} />
      <FormStatus state={state} success={t("success")} />
      <div>
        <SubmitButton pending={pending}>{t("submit")}</SubmitButton>
      </div>
    </form>
  );
}
