/**
 * The package configurator (§9.2.10, R-081): sports → intensity → period. The price is computed on
 * the server (`POST /api/v1/subscriptions/quote`, R-084: the discounts and the rounding to a whole
 * leu); here only the choice and what is sent. Money comes in bani (RON × 100, invariant 5).
 */
export const SPORTS = ["padel", "tennis", "pilates"] as const;
export const INTENSITIES = ["start", "active", "pro"] as const;
export const PERIODS = ["monthly", "quarterly", "annual"] as const;

export type Sport = (typeof SPORTS)[number];
export type Intensity = (typeof INTENSITIES)[number];
export type Period = (typeof PERIODS)[number];
export type Choice = { sports: Partial<Record<Sport, Intensity>>; period: Period };

export const START: Choice = { sports: { padel: "active" }, period: "monthly" };

/** Adds a sport (at the Activ intensity) or removes it; at least one sport always stays. */
export function toggleSport(choice: Choice, sport: Sport): Choice {
  const sports = { ...choice.sports };
  if (sports[sport]) {
    if (Object.keys(sports).length === 1) return choice;
    delete sports[sport];
  } else {
    sports[sport] = "active";
  }
  return { ...choice, sports };
}

/** The chosen sports, in the configurator's order. */
export function chosen(choice: Choice): Sport[] {
  return SPORTS.filter((sport) => choice.sports[sport] !== undefined);
}

/** The body of the quote request. */
export function quoteBody(choice: Choice, location: string) {
  return {
    location,
    selections: chosen(choice).map((sport) => ({ sport, intensity: choice.sports[sport] as Intensity })),
    period: choice.period,
  };
}

/** Bani as lei, with the decimals only when there are any: 72000 → "720", 12345 → "123,45". */
export function lei(bani: number, locale: string): string {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: bani % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(
    bani / 100,
  );
}
