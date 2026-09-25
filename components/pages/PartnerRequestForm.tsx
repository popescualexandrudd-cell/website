"use client";

import { useLocale, useTranslations } from "next-intl";
import { submitPartnerRequest } from "@/app/actions/forms";
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

/**
 * "I want to play with …": goes to the club, which puts the two players in touch. Nobody's
 * phone or email is ever shown on the site.
 */
export function PartnerRequestForm({
  players,
  selected,
  turnstileSiteKey,
  nonce,
}: {
  players: { id: string; label: string }[];
  selected: string | null;
  turnstileSiteKey?: string | null;
  nonce?: string;
}) {
  const t = useTranslations("partner.request");
  const tc = useTranslations("contact");
  const locale = useLocale();
  const errorText = useErrorText();
  const { state, pending, formProps } = useFormAction(submitPartnerRequest);
  useConversion(state.status === "success", "partner_request");
  if (state.status === "success") return <FormStatus state={state} success={t("success")} />;
  return (
    <form {...formProps} className="grid gap-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <Honeypot />
      <AttributionField />
      <div className="booking-fields">
        <SelectField
          name="playerId"
          label={t("player")}
          defaultValue={selected ?? players[0]?.id}
          className="booking-fields-wide"
        >
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.label}
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
