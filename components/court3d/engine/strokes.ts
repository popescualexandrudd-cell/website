import { clip, type Clip, type Key } from "./pose";

/**
 * Keyframes for a right-handed player (root space: facing -z, right hand towards +x).
 * Heights in metres for a 1.83 m athlete; angles in degrees.
 */

const READY: Omit<Key, "t"> = {
  pelvis: [0, 0.9, 0, 0, 6, 0],
  chest: [0, 14, 0],
  hand: [0.14, 0.98, -0.36],
  dir: [-0.38, 0.42, -0.82],
  face: [0.9, 0.1, -0.4],
  left: "throat",
  lFoot: [-0.33, 0.02, 10, 0],
  rFoot: [0.33, 0.02, -10, 0],
};

const at = (t: number, key: Omit<Key, "t">): Key => ({ t, ...key });

/** Ready position with a gentle breathing sway; loops. */
export const readyClip: Clip = clip("ready", null, [
  at(0, READY),
  at(0.8, { ...READY, pelvis: [0, 0.885, 0, 0, 7, 0], hand: [0.14, 0.97, -0.37] }),
  at(1.6, READY),
]);

/** Split step: a small hop as the opponent strikes, landing balanced and lower. */
export const splitStepClip: Clip = clip("split", null, [
  at(0, READY),
  at(0.12, {
    ...READY,
    pelvis: [0, 0.97, 0, 0, 4, 0],
    lFoot: [-0.3, 0.02, 10, 18],
    rFoot: [0.3, 0.02, -10, 18],
  }),
  at(0.26, {
    ...READY,
    pelvis: [0, 0.86, 0, 0, 8, 0],
    lFoot: [-0.38, 0.02, 12, 0],
    rFoot: [0.38, 0.02, -12, 0],
  }),
  at(0.42, READY),
]);

/**
 * Topspin forehand, semi-open stance. Unit turn (shoulders past 80°), loop, racket drop below
 * the ball, hips then shoulders unwind, contact in front of the right hip, windshield-wiper
 * pronation, finish over the left shoulder.
 */
export const forehandClip: Clip = clip("forehand", 0.86, [
  at(0, READY),
  at(0.3, {
    pelvis: [0.06, 0.88, 0.02, -35, 8, 0],
    chest: [-78, 12, 0],
    hand: [0.42, 1.2, 0.04],
    dir: [0.06, 0.76, 0.64],
    face: [0.9, -0.35, 0.3],
    left: [0.22, 1.24, -0.46],
    lFoot: [-0.36, -0.02, 20, 0],
    rFoot: [0.42, 0.14, -40, 0],
  }),
  at(0.55, {
    pelvis: [0.12, 0.85, 0.05, -45, 10, -4],
    chest: [-96, 12, 0],
    hand: [0.6, 1.2, 0.3],
    dir: [0.3, 0.32, 0.9],
    face: [0.1, -0.95, 0.3],
    left: [0.24, 1.2, -0.45],
    lFoot: [-0.36, -0.02, 20, 0],
    rFoot: [0.42, 0.14, -40, 0],
  }),
  at(0.72, {
    pelvis: [0.1, 0.83, 0.03, -28, 10, -3],
    chest: [-70, 10, 0],
    hand: [0.6, 0.8, 0.16],
    dir: [0.2, -0.75, 0.62],
    face: [0.1, -0.95, 0.3],
    left: [0.05, 1.18, -0.42],
    lFoot: [-0.36, -0.02, 20, 0],
    rFoot: [0.42, 0.14, -40, 0],
  }),
  at(0.86, {
    pelvis: [0.05, 0.87, 0, 10, 8, 0],
    chest: [-12, 10, 0],
    hand: [0.38, 0.9, -0.3],
    dir: [0.8, 0.05, -0.6],
    face: [-0.6, -0.05, -0.8],
    elbow: [0.3, -0.9, 0.3],
    left: [-0.32, 1.1, -0.22],
    lFoot: [-0.36, -0.02, 20, 0],
    rFoot: [0.42, 0.14, -40, 8],
  }),
  at(0.98, {
    pelvis: [0.02, 0.9, -0.02, 25, 8, 0],
    chest: [32, 10, 0],
    hand: [0.08, 1.26, -0.5],
    dir: [-0.35, 0.85, -0.4],
    face: [-0.9, -0.35, 0.1],
    elbow: [0.4, -0.7, 0.4],
    left: [-0.34, 1.12, -0.12],
    lFoot: [-0.36, -0.02, 20, 0],
    rFoot: [0.42, 0.14, -35, 20],
  }),
  at(1.14, {
    pelvis: [0, 0.91, -0.02, 38, 6, 0],
    chest: [60, 8, 0],
    hand: [-0.3, 1.42, -0.14],
    dir: [0.2, 0.25, 0.95],
    face: [0.95, -0.2, -0.15],
    elbow: [0.5, -0.3, -0.6],
    left: "throat",
    lFoot: [-0.36, -0.02, 20, 0],
    rFoot: [0.4, 0.12, -30, 30],
  }),
  at(1.6, READY),
]);

/**
 * Two-handed backhand, neutral stance: shoulders turn past 90°, both hands take the racket
 * back and below the ball, contact in front of the left hip, finish over the right shoulder.
 */
export const backhandClip: Clip = clip("backhand", 0.86, [
  at(0, READY),
  at(0.3, {
    pelvis: [-0.06, 0.88, 0.02, 40, 8, 0],
    chest: [88, 12, 0],
    hand: [-0.4, 1.1, 0.12],
    dir: [-0.1, 0.72, 0.68],
    face: [-0.9, -0.3, 0.3],
    elbow: [0.2, -0.8, 0.5],
    left: "grip",
    leftElbow: [-0.4, -0.8, 0.4],
    lFoot: [-0.42, 0.12, 35, 0],
    rFoot: [0.28, -0.08, -10, 0],
  }),
  at(0.55, {
    pelvis: [-0.1, 0.85, 0.05, 50, 10, 3],
    chest: [102, 12, 0],
    hand: [-0.55, 1.12, 0.28],
    dir: [-0.35, 0.22, 0.9],
    face: [-0.1, -0.95, 0.3],
    elbow: [0.2, -0.8, 0.5],
    left: "grip",
    leftElbow: [-0.4, -0.8, 0.4],
    lFoot: [-0.42, 0.12, 35, 0],
    rFoot: [0.28, -0.08, -10, 0],
  }),
  at(0.72, {
    pelvis: [-0.08, 0.83, 0.03, 30, 10, 3],
    chest: [75, 10, 0],
    hand: [-0.55, 0.8, 0.18],
    dir: [-0.25, -0.72, 0.65],
    face: [-0.1, -0.95, 0.3],
    elbow: [0.2, -0.8, 0.5],
    left: "grip",
    leftElbow: [-0.4, -0.8, 0.4],
    lFoot: [-0.42, 0.12, 35, 0],
    rFoot: [0.28, -0.08, -10, 0],
  }),
  at(0.86, {
    pelvis: [-0.04, 0.87, 0, 0, 8, 0],
    chest: [18, 10, 0],
    hand: [-0.33, 0.9, -0.33],
    dir: [-0.85, 0.05, -0.52],
    face: [0.52, -0.03, -0.85],
    elbow: [0.1, -0.9, 0.3],
    left: "grip",
    leftElbow: [-0.3, -0.9, 0.2],
    lFoot: [-0.42, 0.12, 35, 0],
    rFoot: [0.28, -0.08, -10, 0],
  }),
  at(0.98, {
    pelvis: [-0.02, 0.9, -0.02, -18, 8, 0],
    chest: [-28, 10, 0],
    hand: [0.02, 1.22, -0.55],
    dir: [0.35, 0.85, -0.4],
    face: [0.9, -0.35, 0.1],
    elbow: [0.2, -0.8, 0.3],
    left: "grip",
    leftElbow: [-0.3, -0.7, 0.4],
    lFoot: [-0.42, 0.12, 35, 15],
    rFoot: [0.28, -0.08, -10, 0],
  }),
  at(1.14, {
    pelvis: [0, 0.91, -0.02, -30, 6, 0],
    chest: [-52, 8, 0],
    hand: [0.3, 1.44, -0.12],
    dir: [-0.25, 0.3, 0.92],
    face: [-0.95, -0.2, -0.15],
    elbow: [0.4, -0.2, -0.7],
    left: "grip",
    leftElbow: [-0.2, -0.3, -0.8],
    lFoot: [-0.42, 0.12, 30, 30],
    rFoot: [0.28, -0.08, -10, 0],
  }),
  at(1.6, READY),
]);

/**
 * Flat-topspin first serve. Platform stance, ball toss with a straight left arm, trophy
 * position (knees flexed, shoulders tilted, elbow at shoulder height), racket drop behind the
 * back, leg drive and trunk rotation, contact at full extension with forearm pronation,
 * landing on the left foot inside the court.
 */
export const serveClip: Clip = clip("serve", 1.5, [
  at(0, {
    pelvis: [0.05, 0.93, 0.05, -65, 4, 0],
    chest: [-78, 8, 0],
    hand: [0.2, 1.05, -0.34],
    dir: [-0.1, 0.35, -0.93],
    face: [0.95, 0.1, -0.1],
    left: [0.14, 1.08, -0.46],
    lFoot: [0, -0.2, -40, 0],
    rFoot: [0.36, 0.28, -85, 0],
  }),
  at(0.45, {
    pelvis: [0.08, 0.92, 0.08, -70, 4, 0],
    chest: [-84, 6, 0],
    hand: [0.46, 0.92, 0.24],
    dir: [0.25, -0.5, 0.83],
    face: [0.95, 0.2, -0.15],
    left: [-0.02, 0.98, -0.36],
    lFoot: [0, -0.2, -40, 0],
    rFoot: [0.36, 0.28, -85, 0],
  }),
  at(0.95, {
    pelvis: [0.02, 0.87, 0, -78, 0, 4],
    chest: [-96, -6, -14],
    hand: [0.52, 1.35, 0.33],
    dir: [0.22, 0.6, 0.77],
    face: [0.95, -0.2, -0.1],
    elbow: [0.9, -0.2, 0.3],
    left: [0.05, 1.95, -0.45],
    leftElbow: [-0.9, 0, -0.2],
    lFoot: [0, -0.2, -40, 0],
    rFoot: [0.36, 0.28, -85, 0],
  }),
  at(1.15, {
    pelvis: [-0.02, 0.82, -0.06, -80, -4, 6],
    chest: [-100, -14, -20],
    hand: [0.44, 1.64, 0.2],
    dir: [0.25, 0.95, 0.05],
    face: [0.9, -0.2, 0.35],
    elbow: [0.95, 0.25, 0.2],
    left: [0.06, 1.9, -0.4],
    leftElbow: [-0.9, 0, -0.2],
    lFoot: [0, -0.2, -40, 0],
    rFoot: [0.3, 0.24, -85, 10],
  }),
  at(1.38, {
    pelvis: [-0.02, 0.97, -0.12, -40, 0, 2],
    chest: [-42, -10, -10],
    hand: [0.32, 1.38, 0.34],
    dir: [0.05, -0.85, 0.5],
    face: [0.95, 0.15, 0.2],
    elbow: [0.6, 0.8, -0.1],
    left: [-0.22, 1.18, -0.3],
    lFoot: [0, -0.2, -40, 25],
    rFoot: [0.26, 0.2, -75, 30],
  }),
  at(1.5, {
    pelvis: [0, 1.04, -0.16, -5, 2, 0],
    chest: [5, 5, 10],
    hand: [0.2, 2.03, -0.3],
    dir: [0.2, 0.9, -0.4],
    face: [0, -0.4, -0.9],
    elbow: [0.6, 0.4, 0.6],
    left: [-0.2, 1.2, -0.2],
    lFoot: [0, -0.2, -30, 45],
    rFoot: [0.22, 0.12, -60, 50],
  }),
  at(1.75, {
    pelvis: [-0.06, 0.88, -0.45, 40, 20, 0],
    chest: [55, 32, 0],
    hand: [-0.36, 0.95, -0.55],
    dir: [-0.4, -0.7, -0.2],
    face: [0.6, -0.5, 0.6],
    elbow: [0.5, -0.4, 0.6],
    left: [-0.3, 1.0, -0.2],
    lFoot: [-0.06, -0.72, -10, 0],
    rFoot: [0.24, 0.3, -60, 60],
  }),
  at(2.3, {
    ...READY,
    pelvis: [0, 0.9, -0.36, 0, 6, 0],
    hand: [0.14, 0.98, -0.72],
    lFoot: [-0.33, -0.36, 10, 0],
    rFoot: [0.33, -0.34, -10, 0],
  }),
]);

export const STROKES = {
  forehand: forehandClip,
  backhand: backhandClip,
  serve: serveClip,
} as const;
export type StrokeName = keyof typeof STROKES;
