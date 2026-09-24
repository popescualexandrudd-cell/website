"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { cancelBookingByToken } from "@/app/actions/booking";
import { idleState } from "@/lib/validation";
import { SubmitButton, TextArea } from "@/components/ui/form";

export function CancelForm({ token, hours }: { token: string; hours: number }) {
  const t = useTranslations("manage");
  const [state, action] = useActionState(cancelBookingByToken, idleState);
  if (state.status === "success") {
    return (
      <p role="status" className="notice">
        {t("cancelled")}
      </p>
    );
  }
  const errorMessage =
    state.status === "error"
      ? state.error === "tooLate"
        ? `${t("tooLate", { hours })} ${t("tooLateHelp")}`
        : state.error === "notActive"
          ? t("alreadyCancelled")
          : t("notFound")
      : null;
  return (
    <form
      action={action}
      className="grid max-w-xl gap-4"
      onSubmit={(event) => {
        if (!window.confirm(t("cancelConfirm"))) event.preventDefault();
      }}
    >
      <input type="hidden" name="token" value={token} />
      <TextArea name="reason" optional rows={3} label={t("cancelReason")} />
      {errorMessage ? (
        <p role="alert" className="booking-alert">
          {errorMessage}
        </p>
      ) : null}
      <div>
        <SubmitButton className="btn btn-secondary">{t("cancelSubmit")}</SubmitButton>
      </div>
    </form>
  );
}
