/**
 * Stroke animation data. A pose is a flat list of channels (root space, metres and degrees):
 * the character stands at the origin facing -z (towards the net), right hand towards +x.
 *
 * Every stroke is a list of keyframes along real stroke phases (ready position, unit turn,
 * backswing, racket drop, contact, follow-through, recovery). The arms and legs are not keyed
 * joint by joint: the keys give where the hand holds the racket, how the racket is oriented,
 * where the feet are, and the rotations of hips and shoulders. Inverse kinematics finds the
 * elbows and knees, which keeps contact points exact and feet planted.
 */

export type Vec3 = [number, number, number];

export type Key = {
  t: number;
  /** Pelvis centre x, height, z, and yaw / forward pitch / side roll (degrees). */
  pelvis: [number, number, number, number, number, number];
  /** Shoulder line: yaw (root space), forward lean, side bend (degrees). */
  chest: Vec3;
  /** Racket hand (the grip point). */
  hand: Vec3;
  /** Racket axis, from the grip towards the head. */
  dir: Vec3;
  /** String-bed normal (the direction the strings face). */
  face: Vec3;
  /** Where the elbow points, in shoulder space. */
  elbow?: Vec3;
  /** Free hand: a position, or on the racket (two-handed grip / supporting the throat). */
  left: Vec3 | "grip" | "throat";
  leftElbow?: Vec3;
  /** Feet: x, z, yaw (degrees, toes turning left positive), heel lift (degrees). */
  lFoot: [number, number, number, number];
  rFoot: [number, number, number, number];
};

export const CHANNELS = 37;

const DEFAULT_ELBOW: Vec3 = [0.55, -0.75, 0.35];
const DEFAULT_LEFT_ELBOW: Vec3 = [-0.55, -0.75, 0.35];

function flatten(key: Key): number[] {
  const leftPos: Vec3 = Array.isArray(key.left) ? key.left : key.hand;
  const grip = key.left === "grip" ? 1 : 0;
  const throat = key.left === "throat" ? 1 : 0;
  return [
    ...key.pelvis,
    ...key.chest,
    ...key.hand,
    ...key.dir,
    ...key.face,
    ...(key.elbow ?? DEFAULT_ELBOW),
    ...leftPos,
    grip,
    throat,
    ...(key.leftElbow ?? DEFAULT_LEFT_ELBOW),
    ...key.lFoot,
    ...key.rFoot,
  ];
}

export type Clip = {
  name: string;
  duration: number;
  /** Time of ball contact, when the clip has one. */
  contact: number | null;
  times: number[];
  values: number[][];
};

export function clip(name: string, contact: number | null, keys: Key[]): Clip {
  return {
    name,
    contact,
    duration: keys.at(-1)?.t ?? 0,
    times: keys.map((k) => k.t),
    values: keys.map(flatten),
  };
}

/**
 * Samples a clip with non-uniform Catmull-Rom interpolation (smooth velocities through every
 * key, as real strokes have no stops except at the planned pauses).
 */
export function sample(c: Clip, time: number, out: Float32Array): Float32Array {
  const { times, values } = c;
  const n = times.length;
  const t = Math.min(Math.max(time, 0), c.duration);
  let i = 0;
  while (i < n - 2 && t > (times[i + 1] ?? 0)) i++;
  const t0 = times[i] ?? 0;
  const t1 = times[i + 1] ?? t0 + 1;
  const tm = times[i - 1] ?? t0 - (t1 - t0);
  const tp = times[i + 2] ?? t1 + (t1 - t0);
  const v0 = values[i] ?? [];
  const v1 = values[i + 1] ?? v0;
  const vm = values[i - 1] ?? v0;
  const vp = values[i + 2] ?? v1;
  const h = t1 - t0;
  const u = h > 0 ? (t - t0) / h : 0;
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;
  for (let k = 0; k < CHANNELS; k++) {
    const p0 = v0[k] ?? 0;
    const p1 = v1[k] ?? 0;
    const m0 = (((v1[k] ?? 0) - (vm[k] ?? 0)) / (t1 - tm)) * h;
    const m1 = (((vp[k] ?? 0) - (v0[k] ?? 0)) / (tp - t0)) * h;
    out[k] = h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
  }
  return out;
}
