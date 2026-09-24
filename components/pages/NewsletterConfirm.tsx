"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { confirmNewsletter } from "@/app/actions/forms";
import { idleState } from "@/lib/validation";
import { SubmitButton } from "@/components/ui/form";

/** A button, not an automatic GET: mail scanners open links and must not (un)subscribe anyone. */
export function NewsletterConfirm({ token, label }: { token: string; label: string }) {
  const t = useTranslations("newsletter");
  const [state, action] = useActionState(confirmNewsletter, idleState);
  if (state.status === "success") {
    return (
      <p role="status" className="notice">
        {state.data?.kind === "unsubscribed" ? t("unsubscribed") : t("confirmed")}
      </p>
    );
  }
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      {state.status === "error" ? (
        <p role="alert" className="booking-alert">
          {t("invalid")}
        </p>
      ) : null}
      <div>
        <SubmitButton>{label}</SubmitButton>
      </div>
    </form>
  );
}
