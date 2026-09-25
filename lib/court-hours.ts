/**
 * Half-hour start times while the club is open (the last one leaves an hour to play). A closing
 * time after midnight ("08:00–01:00") counts as the next day.
 */
export function startTimes(open: string, close: string): string[] {
  const toMinutes = (value: string) => {
    const [h, m] = value.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  const start = toMinutes(open);
  const end = toMinutes(close) <= start ? toMinutes(close) + 24 * 60 : toMinutes(close);
  const out: string[] = [];
  for (let m = start; m <= end - 60; m += 30) {
    const h = Math.floor(m / 60) % 24;
    out.push(`${String(h).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
}
