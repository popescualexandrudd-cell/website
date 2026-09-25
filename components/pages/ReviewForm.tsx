"use client";

import { useFormAction } from "@/components/ui/useFormAction";
import { useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { submitReview } from "@/app/actions/forms";
import {
  FormStatus,
  Honeypot,
  SubmitButton,
  TextArea,
  TextField,
  useErrorText,
} from "@/components/ui/form";

/** After the review is sent, a link to the club's Google reviews invites a public one too. */
export function ReviewForm({ token, googleUrl }: { token: string; googleUrl: string }) {
  const t = useTranslations("review");
  const locale = useLocale();
  const errorText = useErrorText();
  const id = useId();
  const { state, pending, formProps: actionProps } = useFormAction(submitReview);
  if (state.status === "success")
    return (
      <div className="grid gap-4">
        <FormStatus state={state} success={t("success")} />
        <p>
          <a href={googleUrl} rel="noopener noreferrer" target="_blank" className="btn-secondary">
            {t("google")}
          </a>
        </p>
      </div>
    );
  const general =
    state.status === "error" && state.error === "invalid"
      ? t("invalid")
      : state.status === "error" && state.error === "already"
        ? t("already")
        : null;
  return (
    <form {...actionProps} className="grid max-w-2xl gap-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="locale" value={locale} />
      <Honeypot />
      <TextField
        name="author"
        label={t("name")}
        hint={t("nameHint")}
        error={errorText(state.fieldErrors?.author ? "name" : undefined)}
      />
      <TextField name="role" optional label={t("role")} hint={t("roleHint")} />
      <TextArea name="text" rows={6} label={t("text")} error={errorText(state.fieldErrors?.text)} />
      <div className="flex items-start gap-3">
        <input
          id={`publish-${id}`}
          name="consent"
          type="checkbox"
          className="mt-1 size-5 shrink-0 accent-[var(--color-cerneala)]"
        />
        <label htmlFor={`publish-${id}`} className="text-[0.95rem] leading-snug">
          {t("consent")}
        </label>
      </div>
      {general ? (
        <p role="alert" className="booking-alert">
          {general}
        </p>
      ) : (
        <FormStatus state={state} success={t("success")} />
      )}
      <div>
        <SubmitButton pending={pending}>{t("submit")}</SubmitButton>
      </div>
    </form>
  );
}
