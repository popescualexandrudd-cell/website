"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { submitGiftCard } from "@/app/actions/forms";
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
import {
  GIFT_AMOUNT_MAX,
  GIFT_AMOUNT_MIN,
  GIFT_LESSON_COUNTS,
  describeGiftCard,
  giftCardPrice,
} from "@/lib/gift-cards";

export type GiftLesson = {
  id: string;
  name: string;
  durations: number[];
  hourlyRate: string | null;
};

const AMOUNTS = [150, 250, 500] as const;

/**
 * "Give a tennis lesson": what the card holds (lessons of one type, or an amount), who it is for
 * and the buyer's details. The price updates as the choice changes; payment happens at the club
 * or by bank transfer, so the form only sends a request.
 */
export function GiftCardForm({
  lessons,
  turnstileSiteKey,
  nonce,
}: {
  lessons: GiftLesson[];
  turnstileSiteKey?: string | null;
  nonce?: string;
}) {
  const t = useTranslations("gift");
  const tc = useTranslations("contact");
  const locale = useLocale();
  const errorText = useErrorText();
  const { state, pending, formProps } = useFormAction(submitGiftCard);
  useConversion(state.status === "success", "gift_request");

  const [kind, setKind] = useState<"lectie" | "valoare">(lessons.length > 0 ? "lectie" : "valoare");
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? "");
  const lesson = lessons.find((l) => l.id === lessonId) ?? lessons[0] ?? null;
  const [wantedDuration, setWantedDuration] = useState<number | null>(null);
  const duration =
    lesson && wantedDuration && lesson.durations.includes(wantedDuration)
      ? wantedDuration
      : (lesson?.durations[0] ?? null);
  const [count, setCount] = useState<number>(1);
  const [amount, setAmount] = useState<string>(String(AMOUNTS[1]));

  if (state.status === "success") return <FormStatus state={state} success={t("success")} />;

  const amountNumber = Number.parseInt(amount, 10);
  const value =
    kind === "valoare"
      ? Number.isFinite(amountNumber)
        ? describeGiftCard(
            { lessonName: null, lessons: null, durationMin: null, amountRon: amountNumber },
            locale,
          )
        : null
      : lesson
        ? describeGiftCard(
            { lessonName: lesson.name, lessons: count, durationMin: duration, amountRon: null },
            locale,
          )
        : null;
  const price =
    kind === "valoare"
      ? Number.isFinite(amountNumber)
        ? amountNumber
        : null
      : giftCardPrice({
          amountRon: null,
          hourlyRate: lesson?.hourlyRate ?? null,
          durationMin: duration,
          lessons: count,
        });

  const chip = (
    name: string,
    val: string,
    checked: boolean,
    onChange: () => void,
    label: string,
  ) => (
    <label key={val} className="finder-chip">
      <input type="radio" name={name} value={val} checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );

  return (
    <form {...formProps} className="gift-form" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <Honeypot />
      <AttributionField />

      <div className="gift-form-fields">
        {lessons.length > 0 ? (
          <fieldset className="finder-question">
            <legend>{t("kind")}</legend>
            <div className="finder-options">
              {chip("kind", "lectie", kind === "lectie", () => setKind("lectie"), t("kindLesson"))}
              {chip(
                "kind",
                "valoare",
                kind === "valoare",
                () => setKind("valoare"),
                t("kindValue"),
              )}
            </div>
          </fieldset>
        ) : (
          <input type="hidden" name="kind" value="valoare" />
        )}

        {kind === "lectie" && lesson ? (
          <>
            <div className="booking-fields">
              <SelectField
                name="lessonTypeId"
                label={t("lesson")}
                value={lesson.id}
                onChange={(event) => setLessonId(event.target.value)}
                error={errorText(state.fieldErrors?.lessonTypeId)}
              >
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                name="durationMin"
                label={t("duration")}
                value={String(duration ?? "")}
                onChange={(event) => setWantedDuration(Number(event.target.value))}
              >
                {lesson.durations.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {t("durationOption", { minutes })}
                  </option>
                ))}
              </SelectField>
            </div>
            <fieldset className="finder-question">
              <legend>{t("lessons")}</legend>
              <div className="finder-options">
                {GIFT_LESSON_COUNTS.map((n) =>
                  chip(
                    "lessons",
                    String(n),
                    count === n,
                    () => setCount(n),
                    t("lessonsOption", { count: n }),
                  ),
                )}
              </div>
            </fieldset>
          </>
        ) : (
          <fieldset className="finder-question">
            <legend>{t("amount")}</legend>
            <div className="finder-options">
              {AMOUNTS.map((n) =>
                chip(
                  "amountPreset",
                  String(n),
                  amount === String(n),
                  () => setAmount(String(n)),
                  t("amountOption", { amount: n }),
                ),
              )}
            </div>
            <TextField
              name="amount"
              type="number"
              inputMode="numeric"
              min={GIFT_AMOUNT_MIN}
              max={GIFT_AMOUNT_MAX}
              step={10}
              className="mt-4 max-w-xs"
              label={t("amountCustom")}
              hint={t("amountHint", { min: GIFT_AMOUNT_MIN, max: GIFT_AMOUNT_MAX })}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              error={errorText(state.fieldErrors?.amount)}
            />
          </fieldset>
        )}

        <div className="booking-fields">
          <TextField
            name="recipientName"
            label={t("recipient")}
            hint={t("recipientHint")}
            error={errorText(state.fieldErrors?.recipientName)}
          />
          <TextArea
            name="message"
            rows={2}
            maxLength={300}
            optional
            label={t("message")}
            hint={t("messageHint")}
            className="booking-fields-wide"
          />
          <TextField
            name="name"
            autoComplete="name"
            label={t("buyer")}
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
            label={t("email")}
            hint={t("emailHint")}
            error={errorText(state.fieldErrors?.email)}
          />
        </div>
        <ConsentField error={errorText(state.fieldErrors?.consent)} />
        <Turnstile siteKey={turnstileSiteKey} nonce={nonce} />
        <FormStatus state={state} success={t("success")} />
        <div>
          <SubmitButton pending={pending}>{t("submit")}</SubmitButton>
        </div>
      </div>

      <aside className="gift-preview" aria-live="polite">
        <div className="gift-card-visual">
          <p className="gift-card-kicker">{t("cardKicker")}</p>
          <p className="gift-card-value">{value ?? t("chooseValue")}</p>
          <p className="gift-card-code numerals" aria-hidden="true">
            CADOU-••••-••••
          </p>
        </div>
        <p className="gift-preview-price">
          {price !== null ? (
            <>
              {t("price")} <strong className="numerals">{t("priceValue", { price })}</strong>
            </>
          ) : (
            t("priceOnRequest")
          )}
        </p>
        <p className="gift-preview-note">{t("paymentNote")}</p>
      </aside>
    </form>
  );
}
