"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { submitPlayer } from "@/app/actions/forms";
import { useFormAction } from "@/components/ui/useFormAction";
import { AttributionField, useConversion } from "@/components/ui/Conversion";
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
import { PLAY_SLOTS } from "@/lib/league";

const LEVELS = ["INCEPATOR", "INTERMEDIAR", "AVANSAT", "COMPETITIE"] as const;

/**
 * Sign-up for the amateur league and / or the hitting-partner list. The page decides what is
 * ticked first; the club approves every sign-up before a name appears anywhere.
 */
export function PlayerForm({
  mode,
  turnstileSiteKey,
  nonce,
}: {
  mode: "league" | "partner";
  turnstileSiteKey?: string | null;
  nonce?: string;
}) {
  const t = useTranslations("league.form");
  const tc = useTranslations("contact");
  const locale = useLocale();
  const errorText = useErrorText();
  const { state, pending, formProps } = useFormAction(submitPlayer);
  useConversion(state.status === "success", "player_signup");
  const [partner, setPartner] = useState(mode === "partner");
  if (state.status === "success") return <FormStatus state={state} success={t("success")} />;

  const box = (
    name: string,
    label: string,
    defaultChecked = false,
    onChange?: (v: boolean) => void,
  ) => (
    <label key={name} className="finder-chip">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        onChange={onChange ? (event) => onChange(event.target.checked) : undefined}
      />
      <span>{label}</span>
    </label>
  );

  return (
    <form {...formProps} className="grid gap-6" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <Honeypot />
      <AttributionField />
      <fieldset className="finder-question">
        <legend>{t("wants")}</legend>
        <div className="finder-options">
          {box("inLeague", t("inLeague"), mode === "league")}
          {box("lookingForPartner", t("lookingForPartner"), mode === "partner", setPartner)}
        </div>
        {state.fieldErrors?.inLeague ? <p className="field-error mt-2">{t("wantsError")}</p> : null}
      </fieldset>
      <fieldset className="finder-question">
        <legend>{t("level")}</legend>
        <div className="finder-options">
          {LEVELS.map((level) => (
            <label key={level} className="finder-chip">
              <input
                type="radio"
                name="level"
                value={level}
                defaultChecked={level === "INTERMEDIAR"}
              />
              <span>{t(`levels.${level}`)}</span>
            </label>
          ))}
        </div>
        <p className="field-hint mt-2">{t("levelHint")}</p>
      </fieldset>
      <fieldset className="finder-question">
        <legend>{t("when")}</legend>
        <div className="finder-options">
          {PLAY_SLOTS.map((slot) => box(`slot_${slot}`, t(`slots.${slot}`)))}
        </div>
      </fieldset>
      <fieldset className="finder-question">
        <legend>{t("format")}</legend>
        <div className="finder-options">
          {box("singles", t("singles"), true)}
          {box("doubles", t("doubles"))}
        </div>
      </fieldset>
      <div className="booking-fields">
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
        <TextArea
          name="about"
          rows={2}
          maxLength={300}
          optional
          label={t("about")}
          hint={t("aboutHint")}
          className="booking-fields-wide"
        />
      </div>
      {partner ? (
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="listed"
            defaultChecked
            className="mt-1 size-5 shrink-0 accent-[var(--color-cerneala)]"
          />
          <span className="text-[0.95rem] leading-snug">{t("listed")}</span>
        </label>
      ) : null}
      <ConsentField error={errorText(state.fieldErrors?.consent)} />
      <Turnstile siteKey={turnstileSiteKey} nonce={nonce} />
      <FormStatus state={state} success={t("success")} />
      <div>
        <SubmitButton pending={pending}>{t("submit")}</SubmitButton>
      </div>
    </form>
  );
}
