/**
 * The league section (§9.2.7): the ranks in order and what the points simulator sends to the API
 * (`GET /api/v1/league/lp-preview`). The LP themselves are computed by the league engine on the
 * server, never here (§9.2.7: "exact formula, through the API, not a copy").
 */
export const TIERS = ["bronze", "silver", "gold", "platinum", "diamond", "master"] as const;
export const DIVISIONS = ["IV", "III", "II", "I"] as const;

export type Tier = (typeof TIERS)[number];
export type Division = (typeof DIVISIONS)[number];
export type Rank = { tier: Tier; division: Division | null };

/** Every rank from Bronze IV to Master, in order (§6.5: 5 tiers × 4 divisions, then Master). */
export const RANKS: readonly Rank[] = [
  ...TIERS.slice(0, -1).flatMap((tier) => DIVISIONS.map((division) => ({ tier, division }))),
  { tier: "master", division: null },
];

/** A rank as a stable key ("gold-II", "master"), for a select's value. */
export const rankKey = (rank: Rank) => (rank.division ? `${rank.tier}-${rank.division}` : rank.tier);

/** The rank of a key; an unknown key is the first rank, Bronze IV. */
export function rankFromKey(key: string): Rank {
  return RANKS.find((rank) => rankKey(rank) === key) ?? { tier: "bronze", division: "IV" };
}

/** The levels a visitor can choose, 1.0 to 7.0 in half points. */
export const LEVELS = Array.from({ length: 13 }, (_, i) => 1 + i / 2);

/** The highest LP a visitor can choose: 99 below Master (100 is a promotion), 500 for Master. */
export const maxLp = (rank: Rank) => (rank.tier === "master" ? 500 : 99);

export type Choice = {
  you: number;
  partner: number;
  rivalA: number;
  rivalB: number;
  rank: Rank;
  lp: number;
  result: "win" | "loss";
  kind: "official" | "tournament";
};

/** The API query for a choice (no division for Master; the LP kept within the rank). */
export function previewQuery(choice: Choice, location: string) {
  return {
    location,
    you: choice.you,
    partner: choice.partner,
    rival_a: choice.rivalA,
    rival_b: choice.rivalB,
    tier: choice.rank.tier,
    ...(choice.rank.division ? { division: choice.rank.division } : {}),
    lp: Math.min(Math.max(0, Math.round(choice.lp)), maxLp(choice.rank)),
    result: choice.result,
    kind: choice.kind,
  };
}
