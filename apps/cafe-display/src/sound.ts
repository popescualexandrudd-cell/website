/** A short two-tone signal for a new order (§8.7), made on the spot: no sound files, nothing
 * from outside. The browser allows sound only after a first touch; the kiosk's Chromium policy
 * allows it from the start. */
export function ring(context: AudioContext): void {
  const now = context.currentTime;
  for (const [index, frequency] of [880, 1320].entries()) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now + index * 0.18);
    gain.gain.exponentialRampToValueAtTime(0.3, now + index * 0.18 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.18 + 0.16);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now + index * 0.18);
    oscillator.stop(now + index * 0.18 + 0.17);
  }
}
