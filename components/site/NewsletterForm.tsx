"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { subscribeNewsletter } from "@/app/actions/forms";
import { idleState } from "@/lib/validation";
import { ConsentField, FormStatus, Honeypot, SubmitButton, TextField, useErrorText } from "@/components/ui/form";

export function NewsletterForm({ policyVersion }: { policyVersion: string }) {
  const t = useTranslations("footer");
  const locale = useLocale();
  const errorText = useErrorText();
  const [state, action] = useActionState(subscribeNewsletter, idleState);
  return (
    <form action={action} className="relative grid max-w-md gap-4" noValidate>
      <div>
        <h2 className="font-display text-[1.5rem] leading-tight">{t("newsletterTitle")}</h2>
        <p className="mt-1 text-cerneala-2">{t("newsletterText")}</p>
      </div>
      {state.status === "success" ? (
        <FormStatus state={state} success={t("newsletterSuccess")} />
      ) : (
        <>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="policyVersion" value={policyVersion} />
          <Honeypot />
          <TextField
            name="email"
            type="email"
            autoComplete="email"
            label={t("newsletterLabel")}
            error={errorText(state.fieldErrors?.email)}
          />
          <ConsentField label={t("newsletterConsent")} error={errorText(state.fieldErrors?.consent)} />
          <FormStatus state={state} success={t("newsletterSuccess")} />
          <div>
            <SubmitButton className="btn btn-secondary">{t("newsletterSubmit")}</SubmitButton>
          </div>
        </>
      )}
    </form>
  );
}
