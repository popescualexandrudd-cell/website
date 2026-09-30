/**
 * The text of an API error code ("accounts.too_young_for_self_registration") from the catalog's
 * `errors` group. The codes contain a dot, which next-intl reads as nesting (so `t(code)` only ever
 * gave the key back); the message is looked up directly and formatted with its ICU parameters.
 */
import { createTranslator } from "next-intl";

export function errorText(
  errors: Record<string, string> | undefined,
  locale: string,
  code: string | null,
  params: Record<string, string | number> = {},
): string | null {
  const message = code ? errors?.[code] : undefined;
  if (!code || typeof message !== "string") return null;
  const key = code.replace(/\W/g, "_");
  const t = createTranslator({ locale, messages: { e: { [key]: message } }, namespace: "e" });
  return (t as unknown as (k: string, p: Record<string, string | number>) => string)(key, params);
}
