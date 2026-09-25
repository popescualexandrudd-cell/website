/**
 * The amateur league and the hitting-partner list: public names, when people play, match scores
 * and the standings. Pure functions, tested in tests/unit/league.test.ts.
 */

export const PLAY_SLOTS = ["DIMINEATA", "PRANZ", "SEARA", "WEEKEND"] as const;
export type PlaySlot = (typeof PLAY_SLOTS)[number];

const SLOT_LABELS: Record<PlaySlot, { ro: string; en: string }> = {
  DIMINEATA: { ro: "dimineața", en: "mornings" },
  PRANZ: { ro: "la prânz", en: "midday" },
  SEARA: { ro: "seara", en: "evenings" },
  WEEKEND: { ro: "în weekend", en: "weekends" },
};

export function slotLabel(slot: string, locale: string): string {
  const labels = SLOT_LABELS[slot as PlaySlot];
  if (!labels) return slot;
  return locale === "en" ? labels.en : labels.ro;
}

/** What the site shows of a player: the first name and the initial of the last one. */
export function publicPlayerName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0]!;
  const last = parts.length > 1 ? parts[parts.length - 1]! : "";
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first;
}

export type SetScore = { a: number; b: number };

/**
 * "6-4 3-6 10-7" (player A's games first) → the sets; null when it cannot be read. Accepts
 * "6:4", "6–4" and tie-break notes such as "7-6(5)".
 */
export function parseScore(score: string | null | undefined): SetScore[] | null {
  if (!score || !score.trim()) return null;
  const sets = score
    .trim()
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map((set) => set.replace(/\(\d+\)/g, "").match(/^(\d{1,2})\s*[-:–]\s*(\d{1,2})$/));
  if (sets.some((set) => !set)) return null;
  return sets.map((set) => ({ a: Number(set![1]), b: Number(set![2]) }));
}

/** The winner from the sets, when the admin did not tick one. */
export function winnerFromScore(sets: SetScore[] | null): "A" | "B" | null {
  if (!sets || sets.length === 0) return null;
  const a = sets.filter((set) => set.a > set.b).length;
  const b = sets.filter((set) => set.b > set.a).length;
  return a > b ? "A" : b > a ? "B" : null;
}

export type MatchInput = {
  playerAId: string;
  playerBId: string;
  score: string | null;
  winner: "A" | "B" | null;
  walkover: boolean;
};

export type StandingRow = {
  playerId: string;
  played: number;
  won: number;
  lost: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  points: number;
};

/**
 * The table of one group: points (win / loss, a walkover loss scores nothing), then set
 * difference, game difference, and the head-to-head result between two tied players.
 * Matches without a winner (not played yet) do not count.
 */
export function standings(
  matches: MatchInput[],
  points: { win: number; loss: number } = { win: 3, loss: 1 },
): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  const row = (id: string) => {
    let found = rows.get(id);
    if (!found) {
      found = {
        playerId: id,
        played: 0,
        won: 0,
        lost: 0,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        points: 0,
      };
      rows.set(id, found);
    }
    return found;
  };
  const headToHead = new Map<string, string>();

  for (const match of matches) {
    const a = row(match.playerAId);
    const b = row(match.playerBId);
    const sets = parseScore(match.score);
    const winner = match.winner ?? winnerFromScore(sets);
    if (!winner) continue;
    const [w, l] = winner === "A" ? [a, b] : [b, a];
    w.played += 1;
    l.played += 1;
    w.won += 1;
    l.lost += 1;
    w.points += points.win;
    if (!match.walkover) l.points += points.loss;
    headToHead.set(`${w.playerId}>${l.playerId}`, w.playerId);
    for (const set of sets ?? []) {
      a.gamesWon += set.a;
      a.gamesLost += set.b;
      b.gamesWon += set.b;
      b.gamesLost += set.a;
      if (set.a > set.b) {
        a.setsWon += 1;
        b.setsLost += 1;
      } else if (set.b > set.a) {
        b.setsWon += 1;
        a.setsLost += 1;
      }
    }
  }

  return [...rows.values()].sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    const sets = y.setsWon - y.setsLost - (x.setsWon - x.setsLost);
    if (sets !== 0) return sets;
    const games = y.gamesWon - y.gamesLost - (x.gamesWon - x.gamesLost);
    if (games !== 0) return games;
    if (headToHead.has(`${x.playerId}>${y.playerId}`)) return -1;
    if (headToHead.has(`${y.playerId}>${x.playerId}`)) return 1;
    return 0;
  });
}

/** Players of a similar level who play at the same times: the club's suggestions in the admin. */
export function partnerMatches<
  T extends { id: string; level: string; slots: string[]; singles: boolean; doubles: boolean },
>(player: T, others: T[]): T[] {
  const order = ["INCEPATOR", "INTERMEDIAR", "AVANSAT", "COMPETITIE"];
  const level = order.indexOf(player.level);
  return others
    .filter((other) => other.id !== player.id)
    .filter((other) => Math.abs(order.indexOf(other.level) - level) <= 1)
    .filter(
      (other) =>
        player.slots.length === 0 ||
        other.slots.length === 0 ||
        other.slots.some((slot) => player.slots.includes(slot)),
    )
    .filter((other) => (player.singles && other.singles) || (player.doubles && other.doubles))
    .sort(
      (x, y) => Math.abs(order.indexOf(x.level) - level) - Math.abs(order.indexOf(y.level) - level),
    );
}
