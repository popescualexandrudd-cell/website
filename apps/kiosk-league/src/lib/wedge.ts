/**
 * A USB scanner that behaves as a keyboard ("keyboard wedge") types the code very fast and
 * presses Enter. Without a Hardware Bridge (development), the kiosk reads cards this way:
 * characters that arrive close together are collected; Enter ends the code.
 */
export const MAX_GAP_MS = 80;
export const MIN_LENGTH = 6;

export function createWedge(onCode: (code: string) => void, now: () => number = Date.now) {
  let buffer = "";
  let last = 0;
  return (key: string): void => {
    const time = now();
    if (time - last > MAX_GAP_MS) buffer = "";
    last = time;
    if (key === "Enter") {
      if (buffer.length >= MIN_LENGTH) onCode(buffer);
      buffer = "";
      return;
    }
    if (key.length === 1) buffer += key;
  };
}
