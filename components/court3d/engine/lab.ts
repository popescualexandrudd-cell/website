import { Vector3 } from "three";
import { type Player } from "./player";
import { STROKES, type StrokeName } from "./strokes";
import { CHANNELS, sample } from "./pose";
import { type BallView } from "./ballView";
import { simulate, solveShot, STEP } from "./ball";
import { COURT } from "./court";

export { PHASES, phaseAt } from "./phases";

const G = 9.81;

type Plan = {
  /** Ball position for a clip time, or null while the ball is not in play. */
  at: (t: number) => Vector3 | null;
  path: Vector3[];
};

/**
 * The technique lab: one player at the baseline repeating a stroke that can be slowed down,
 * paused and scrubbed. The ball is placed deterministically for any clip time (a coach's feed
 * before contact, the simulated shot after it), so scrubbing backwards is exact.
 */
export class TechniqueLab {
  stroke: StrokeName = "forehand";
  time = 0;
  playing = true;
  speed = 0.45;
  private readonly pose = new Float32Array(CHANNELS);
  private plan: Plan | null = null;
  readonly anchor = new Vector3(0.4, 0, COURT.halfLength + 0.45);

  constructor(
    readonly player: Player,
    readonly ball: BallView,
  ) {}

  enter(): void {
    const root = this.player.root;
    root.position.copy(this.anchor);
    root.rotation.y = 0;
    root.updateMatrixWorld(true);
    this.player.plantFeet = false;
    this.player.velocity.set(0, 0, 0);
    this.ball.clearTrail();
    this.ball.clearMarks();
    this.setStroke(this.stroke);
  }

  setStroke(stroke: StrokeName): void {
    this.stroke = stroke;
    this.time = Math.min(this.time, STROKES[stroke].duration);
    this.plan = this.buildPlan(stroke);
    this.ball.showPath(this.plan.path);
    this.ball.clearMarks();
    const landing = this.plan.path.at(-1);
    const before = this.plan.path.at(-2);
    if (landing && before)
      this.ball.bounce(landing, landing.clone().sub(before).divideScalar(STEP), false);
  }

  get duration(): number {
    return STROKES[this.stroke].duration;
  }

  private buildPlan(stroke: StrokeName): Plan {
    const clip = STROKES[stroke];
    const contactT = clip.contact ?? 0;
    sample(clip, contactT, this.pose);
    this.player.root.updateMatrixWorld(true);
    const contact = this.player.sweetSpot(this.pose, new Vector3());
    const path: Vector3[] = [];

    let before: (t: number) => Vector3 | null;
    if (stroke === "serve") {
      // Toss: from the release of the left hand to contact, under gravity.
      const release = 0.95;
      sample(clip, release, this.pose);
      this.player.apply(this.pose, 0);
      const from = this.player.leftHandWorld(new Vector3());
      const dt = contactT - release;
      const v = contact.clone().sub(from).divideScalar(dt);
      v.y += 0.5 * G * dt;
      before = (t) => {
        // Before the release the ball sits in the hand (the pose is applied first).
        if (t < release) return this.player.leftHandWorld(new Vector3());
        const s = t - release;
        return from
          .clone()
          .addScaledVector(v, s)
          .setY(from.y + v.y * s - 0.5 * G * s * s);
      };
      for (let s = 0; s <= dt; s += 0.02)
        path.push(
          from
            .clone()
            .addScaledVector(v, s)
            .setY(from.y + v.y * s - 0.5 * G * s * s),
        );
    } else {
      // A coach's feed from across the net: one bounce, arriving at the contact point.
      const bounce = new Vector3(contact.x - 0.35, 0.034, contact.z - 3.2);
      const feed = new Vector3(bounce.x - 0.6, 1.15, bounce.z - 7.5);
      const t1 = 0.95;
      const t2 = 0.55;
      const v1 = bounce.clone().sub(feed).divideScalar(t1);
      v1.y += 0.5 * G * t1;
      const v2 = contact.clone().sub(bounce).divideScalar(t2);
      v2.y += 0.5 * G * t2;
      const arc = (p: Vector3, v: Vector3, s: number) =>
        p
          .clone()
          .addScaledVector(v, s)
          .setY(p.y + v.y * s - 0.5 * G * s * s);
      before = (t) => {
        const s = t - (contactT - t1 - t2);
        if (s < 0) return null;
        return s < t1 ? arc(feed, v1, s) : arc(bounce, v2, s - t1);
      };
      for (let s = 0; s <= t1; s += 0.02) path.push(arc(feed, v1, s));
      for (let s = 0; s <= t2; s += 0.02) path.push(arc(bounce, v2, s));
    }
    path.push(contact.clone());

    // The shot itself: cross-court for the groundstrokes, down the T for the serve.
    const target =
      stroke === "serve"
        ? new Vector3(-0.3, 0, -(COURT.serviceLine - 0.5))
        : new Vector3(stroke === "forehand" ? -2.6 : 2.6, 0, -9.6);
    const shot =
      solveShot({
        from: contact,
        target,
        elevationDeg: stroke === "serve" ? -3.5 : 11,
        rpm: stroke === "serve" ? 1400 : 2300,
      }) ??
      solveShot({ from: contact, target, elevationDeg: stroke === "serve" ? 0 : 15, rpm: 1500 });
    const after = shot ? simulate(shot, 3, 1).points : [contact.clone()];
    for (let i = 0; i < after.length; i += 4) {
      const p = after[i];
      if (p) path.push(p);
    }
    const last = after.at(-1);
    if (last) path.push(last);

    return {
      path,
      at: (t) => {
        if (t <= contactT) return before(t);
        const i = Math.round((t - contactT) / STEP);
        return after[Math.min(i, after.length - 1)] ?? null;
      },
    };
  }

  /** Advances playback (when playing) and poses player and ball for the current time. */
  update(dt: number): void {
    const clip = STROKES[this.stroke];
    if (this.playing) {
      this.time += dt * this.speed;
      if (this.time > clip.duration + 0.4) this.time = 0;
    }
    const t = Math.min(this.time, clip.duration);
    sample(clip, t, this.pose);
    this.player.apply(this.pose, 0);
    const ball = this.plan?.at(t) ?? null;
    // The eyes follow the ball (applied on the next frame, which is always drawn).
    this.player.lookAt(ball ?? new Vector3(this.anchor.x, 1.1, 0));
    this.ball.mesh.visible = ball !== null;
    if (ball) this.ball.update(ball, null, 0, false);
  }
}
