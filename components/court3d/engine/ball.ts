import { Vector3 } from "three";
import { netHeightAt } from "./court";

/**
 * Tennis-ball flight and bounce on clay.
 *
 * - Gravity, quadratic air drag (Cd 0.55 for the felt) and the Magnus lift from spin, with the
 *   lift coefficient CL = S / (2S + 1), S = rω / v (Watts & Ferrer).
 * - Bounce: normal restitution 0.78 (clay bounces high and slow) and Coulomb friction μ 0.7
 *   that grips the ball until it rolls; spin changes with the tangential impulse, so topspin
 *   kicks forward and up while slice skids and stays low.
 */

export const BALL_RADIUS = 0.0335;
const MASS = 0.0577;
const AREA = Math.PI * BALL_RADIUS * BALL_RADIUS;
const RHO = 1.2;
const KD = (0.5 * RHO * 0.55 * AREA) / MASS;
const KM = (0.5 * RHO * AREA) / MASS;
const G = 9.81;
const RESTITUTION = 0.78;
const FRICTION = 0.7;
const INERTIA_FACTOR = 0.55; // I = α m r² for a pressurised ball
export const STEP = 1 / 240;

export type BallState = { pos: Vector3; vel: Vector3; spin: Vector3 };

export type BounceEvent = { pos: Vector3; vel: Vector3 };

const tmpA = new Vector3();
const tmpB = new Vector3();
const tmpC = new Vector3();

/** Advances one fixed step; returns the bounce, if the ball touched the ground. */
export function stepBall(state: BallState, dt = STEP): BounceEvent | null {
  const { pos, vel, spin } = state;
  const speed = vel.length();
  // Drag.
  tmpA.copy(vel).multiplyScalar(-KD * speed);
  // Magnus lift.
  const omega = spin.length();
  if (omega > 1 && speed > 0.5) {
    const s = (BALL_RADIUS * omega) / speed;
    const cl = s / (2 * s + 1);
    tmpC.copy(vel).divideScalar(speed);
    tmpB
      .copy(spin)
      .divideScalar(omega)
      .cross(tmpC)
      .multiplyScalar(KM * cl * speed * speed);
    tmpA.add(tmpB);
  }
  tmpA.y -= G;
  vel.addScaledVector(tmpA, dt);
  pos.addScaledVector(vel, dt);
  // Spin decays slowly in the air.
  spin.multiplyScalar(1 - 0.02 * dt);

  if (pos.y < BALL_RADIUS && vel.y < 0) {
    pos.y = BALL_RADIUS;
    const impactVel = vel.clone();
    const vn = -vel.y;
    if (vn < 0.35) {
      // Rolling: no more bounces, clay slows it quickly.
      vel.y = 0;
      vel.multiplyScalar(Math.max(0, 1 - 1.6 * dt));
      spin.set(vel.z / BALL_RADIUS, 0, -vel.x / BALL_RADIUS);
      return null;
    }
    vel.y = vn * RESTITUTION;
    // Contact-point slip velocity (ball bottom relative to the ground).
    const cx = vel.x + BALL_RADIUS * spin.z;
    const cz = vel.z - BALL_RADIUS * spin.x;
    const slip = Math.hypot(cx, cz);
    if (slip > 1e-4) {
      const toRoll = slip * (INERTIA_FACTOR / (1 + INERTIA_FACTOR));
      const j = Math.min(FRICTION * (1 + RESTITUTION) * vn, toRoll);
      const px = (-j * cx) / slip;
      const pz = (-j * cz) / slip;
      vel.x += px;
      vel.z += pz;
      spin.x += -pz / (INERTIA_FACTOR * BALL_RADIUS);
      spin.z += px / (INERTIA_FACTOR * BALL_RADIUS);
    }
    return { pos: pos.clone(), vel: impactVel };
  }
  return null;
}

export type Trajectory = {
  /** Samples every STEP seconds. */
  points: Vector3[];
  bounces: { index: number; pos: Vector3 }[];
  clearsNet: boolean;
};

/** Simulates a flight for up to `seconds`, or until the second bounce. */
export function simulate(start: BallState, seconds: number, stopAfterBounces = 2): Trajectory {
  const state: BallState = {
    pos: start.pos.clone(),
    vel: start.vel.clone(),
    spin: start.spin.clone(),
  };
  const points: Vector3[] = [state.pos.clone()];
  const bounces: { index: number; pos: Vector3 }[] = [];
  let clearsNet = true;
  let prevZ = state.pos.z;
  const steps = Math.ceil(seconds / STEP);
  for (let i = 0; i < steps; i++) {
    const bounce = stepBall(state);
    if (Math.sign(prevZ) !== Math.sign(state.pos.z) && prevZ !== 0) {
      if (state.pos.y < netHeightAt(state.pos.x) + BALL_RADIUS) clearsNet = false;
    }
    prevZ = state.pos.z;
    points.push(state.pos.clone());
    if (bounce) {
      bounces.push({ index: points.length - 1, pos: bounce.pos });
      if (bounces.length >= stopAfterBounces) break;
    }
  }
  return { points, bounces, clearsNet };
}

/** Topspin (positive rpm) or slice (negative) about the axis across the flight direction. */
export function spinFor(direction: Vector3, rpm: number): Vector3 {
  const horizontal = new Vector3(direction.x, 0, direction.z).normalize();
  const axis = new Vector3(0, 1, 0).cross(horizontal).normalize();
  return axis.multiplyScalar((rpm * Math.PI * 2) / 60);
}

/**
 * Finds the launch that lands at `target`: fixed elevation angle, speed found by bisection on
 * the simulated landing distance. Returns null when no speed in range clears the net.
 */
export function solveShot(options: {
  from: Vector3;
  target: Vector3;
  elevationDeg: number;
  rpm: number;
  minSpeed?: number;
  maxSpeed?: number;
}): BallState | null {
  const { from, target, elevationDeg, rpm } = options;
  const flat = new Vector3(target.x - from.x, 0, target.z - from.z);
  const distance = flat.length();
  flat.normalize();
  const elevation = (elevationDeg * Math.PI) / 180;
  const dir = flat.clone().multiplyScalar(Math.cos(elevation)).setY(Math.sin(elevation));
  const spin = spinFor(flat, rpm);
  const launch = (speed: number): BallState => ({
    pos: from.clone(),
    vel: dir.clone().multiplyScalar(speed),
    spin: spin.clone(),
  });
  let lo = options.minSpeed ?? 8;
  let hi = options.maxSpeed ?? 60;
  for (let i = 0; i < 24; i++) {
    const speed = (lo + hi) / 2;
    const landing = simulate(launch(speed), 4, 1).bounces[0]?.pos;
    if (!landing) {
      hi = speed;
      continue;
    }
    const travelled = (landing.x - from.x) * flat.x + (landing.z - from.z) * flat.z;
    if (travelled < distance) lo = speed;
    else hi = speed;
  }
  const state = launch((lo + hi) / 2);
  // Spin acts in the vertical plane of the flight, so the ball stays on the aimed line.
  return simulate(state, 4, 1).clearsNet ? state : null;
}
