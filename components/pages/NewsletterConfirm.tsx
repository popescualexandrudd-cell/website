"use client";

import { useFormAction } from "@/components/ui/useFormAction";
import { useTranslations } from "next-intl";
import { confirmNewsletter } from "@/app/actions/forms";
import { SubmitButton } from "@/components/ui/form";

/** A button, not an automatic GET: mail scanners open links and must not (un)subscribe anyone. */
export function NewsletterConfirm({ token, label }: { token: string; label: string }) {
  const t = useTranslations("newsletter");
  const { state, pending, formProps: actionProps } = useFormAction(confirmNewsletter);
  if (state.status === "success") {
    return (
      <p role="status" className="notice">
        {state.data?.kind === "unsubscribed" ? t("unsubscribed") : t("confirmed")}
      </p>
    );
  }
  return (
    <form {...actionProps} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      {state.status === "error" ? (
        <p role="alert" className="booking-alert">
          {t("invalid")}
        </p>
      ) : null}
      <div>
        <SubmitButton pending={pending}>{label}</SubmitButton>
      </div>
    </form>
  );
}
