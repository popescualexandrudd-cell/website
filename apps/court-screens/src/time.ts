/**
 * Time on the screens: the server's clock is the reference (the screen's own clock may be off),
 * so the state carries `server_time` and the screen keeps the difference. Minutes left are
 * rounded up: "00:01" in the last minute, never "00:00" while the session is still on.
 */

/** How far the server's clock is ahead of this screen's (ms). */
export function clockOffset(serverTime: string, receivedAt: number): number {
  const server = Date.parse(serverTime);
  return Number.isNaN(server) ? 0 : server - receivedAt;
}

export function minutesLeft(endsAt: string, now: number): number {
  return Math.max(0, Math.ceil((Date.parse(endsAt) - now) / 60_000));
}

/** 47 → "00:47", 95 → "01:35" (§8.5). */
export function hoursMinutes(minutes: number): string {
  const whole = Math.max(0, Math.floor(minutes));
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

/** When the screen must reload by itself: a session ends or the next one starts (these are not
 * changes in the database, so no "changed" notice comes for them). */
export function nextBoundary(moments: (string | null | undefined)[], now: number): number | null {
  const future = moments
    .filter((m): m is string => typeof m === "string")
    .map((m) => Date.parse(m))
    .filter((m) => !Number.isNaN(m) && m > now);
  return future.length ? Math.min(...future) : null;
}
