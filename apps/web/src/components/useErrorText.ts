"use client";

import { useLocale, useMessages, useTranslations } from "next-intl";
import { errorText } from "@/lib/error-text";

/** The text of an API error: its `errors.<code>` translation, or "can't reach the club" otherwise. */
export function useErrorText() {
  const t = useTranslations("web.account");
  const locale = useLocale();
  const messages = useMessages() as { errors?: Record<string, string> };
  return (code: string | null, params: Record<string, string | number> = {}) => errorText(messages.errors, locale, code, params) ?? t("offline");
}
