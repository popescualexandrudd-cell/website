import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import {
  BALL_RADIUS,
  simulate,
  solveShot,
  spinFor,
  stepBall,
  type BallState,
} from "@/components/court3d/engine/ball";
import { COURT, netHeightAt } from "@/components/court3d/engine/court";
import { CHANNELS, sample } from "@/components/court3d/engine/pose";
import { STROKES, readyClip } from "@/components/court3d/engine/strokes";
import { PHASES, phaseAt } from "@/components/court3d/engine/phases";

describe("court dimensions", () => {
  it("uses the ITF measurements and a sagging net", () => {
    expect(COURT.halfLength * 2).toBeCloseTo(23.77, 2);
    expect(COURT.halfDoubles * 2).toBeCloseTo(10.97, 2);
    expect(netHeightAt(0)).toBeCloseTo(0.914, 3);
    expect(netHeightAt(COURT.netPost)).toBeCloseTo(1.07, 3);
  });
});

describe("ball physics", () => {
  it("air drag slows the ball down", () => {
    const state: BallState = {
      pos: new Vector3(0, 10, 0),
      vel: new Vector3(20, 0, 0),
      spin: new Vector3(),
    };
    for (let i = 0; i < 240; i++) stepBall(state);
    expect(state.vel.x).toBeLessThan(20);
    expect(state.vel.x).toBeGreaterThan(10);
  });

  it("topspin dips the ball: it lands shorter than a flat shot", () => {
    const from = new Vector3(0, 1, 12);
    const dir = new Vector3(0, Math.sin(0.15), -Math.cos(0.15)).multiplyScalar(28);
    const flat = simulate({ pos: from.clone(), vel: dir.clone(), spin: new Vector3() }, 4, 1);
    const top = simulate({ pos: from.clone(), vel: dir.clone(), spin: spinFor(dir, 2500) }, 4, 1);
    const flatZ = flat.bounces[0]?.pos.z ?? 0;
    const topZ = top.bounces[0]?.pos.z ?? 0;
    expect(topZ).toBeGreaterThan(flatZ);
  });

  it("bounces on clay with less vertical speed than it arrived with", () => {
    const state: BallState = {
      pos: new Vector3(0, 0.05, 0),
      vel: new Vector3(0, -8, -15),
      spin: new Vector3(),
    };
    let bounce = null;
    for (let i = 0; i < 20 && !bounce; i++) bounce = stepBall(state);
    expect(bounce).not.toBeNull();
    expect(state.vel.y).toBeGreaterThan(0);
    expect(state.vel.y).toBeLessThan(8);
    expect(state.pos.y).toBeGreaterThanOrEqual(BALL_RADIUS);
  });

  it("solves a rally shot that clears the net and lands at the target", () => {
    const from = new Vector3(0.8, 0.95, 12.6);
    const target = new Vector3(-2, 0, -8.5);
    const shot = solveShot({ from, target, elevationDeg: 10, rpm: 2200 });
    expect(shot).not.toBeNull();
    if (!shot) return;
    const flight = simulate(shot, 4, 1);
    expect(flight.clearsNet).toBe(true);
    const landing = flight.bounces[0]?.pos;
    expect(landing).toBeDefined();
    expect(landing?.distanceTo(new Vector3(target.x, BALL_RADIUS, target.z)) ?? 99).toBeLessThan(
      0.3,
    );
  });
});

describe("stroke animation", () => {
  it("every clip starts and ends in a consistent pose, with contact inside the clip", () => {
    for (const clip of Object.values(STROKES)) {
      expect(clip.contact).not.toBeNull();
      expect(clip.contact ?? 0).toBeGreaterThan(0);
      expect(clip.contact ?? 0).toBeLessThan(clip.duration);
      const first = sample(clip, 0, new Float32Array(CHANNELS));
      expect(Array.from(first).every(Number.isFinite)).toBe(true);
    }
  });

  it("interpolates smoothly: no jumps between neighbouring frames", () => {
    const a = new Float32Array(CHANNELS);
    const b = new Float32Array(CHANNELS);
    for (const clip of [...Object.values(STROKES), readyClip]) {
      for (let t = 0; t < clip.duration; t += 1 / 60) {
        sample(clip, t, a);
        sample(clip, t + 1 / 60, b);
        // Hand position (metres): no more than ~40 cm per frame, even at the fastest swing.
        const moved = Math.hypot(
          (a[9] ?? 0) - (b[9] ?? 0),
          (a[10] ?? 0) - (b[10] ?? 0),
          (a[11] ?? 0) - (b[11] ?? 0),
        );
        expect(moved).toBeLessThan(0.4);
      }
    }
  });

  it("maps clip time to the lab phases", () => {
    expect(phaseAt("forehand", 0)).toBe(0);
    expect(phaseAt("forehand", STROKES.forehand.contact ?? 0)).toBe(3);
    expect(phaseAt("serve", STROKES.serve.contact ?? 0)).toBe(4);
    expect(PHASES.serve.at(-1)).toBeCloseTo(STROKES.serve.duration, 5);
  });
});
