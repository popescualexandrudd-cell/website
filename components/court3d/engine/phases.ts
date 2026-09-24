import type { StrokeName } from "./strokes";

/**
 * Phase boundaries (clip seconds) shown in the technique lab, per stroke. Kept free of three.js
 * so the page can import it without loading the 3D engine.
 */
export const PHASES: Record<StrokeName, number[]> = {
  forehand: [0, 0.3, 0.62, 0.83, 0.9, 1.6],
  backhand: [0, 0.3, 0.62, 0.83, 0.9, 1.6],
  serve: [0, 0.45, 1.05, 1.32, 1.47, 1.56, 2.3],
};

export function phaseAt(stroke: StrokeName, time: number): number {
  const bounds = PHASES[stroke];
  for (let i = bounds.length - 2; i >= 0; i--) if (time >= (bounds[i] ?? 0)) return i;
  return 0;
}
