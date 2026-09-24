import { Vector3 } from "three";
import { type Player } from "./player";
import { STROKES, readyClip, splitStepClip, type StrokeName } from "./strokes";
import { CHANNELS, sample, type Clip } from "./pose";
import { type BallView } from "./ballView";
import { simulate, solveShot, stepBall, STEP, BALL_RADIUS, type BallState } from "./ball";
import { COURT } from "./court";
import { rng } from "./textures";

const GRAVITY = new Vector3(0, -9.81, 0);
const MAX_RUN_SPEED = 6.2;

type Action = {
  clip: Clip;
  start: number;
  speed: number;
  /** Root-space correction applied to the racket hand around contact. */
  adjust: Vector3;
};

type Move = { from: Vector3; to: Vector3; start: number; end: number };

/** One of the two players and everything the director decides for them. */
class Athlete {
  readonly root: Vector3;
  action: Action | null = null;
  move: Move | null = null;
  readonly pose = new Float32Array(CHANNELS);
  private readonly readyOffset: number;
  readonly contactLocal: Record<StrokeName, Vector3>;

  constructor(
    readonly player: Player,
    /** +1: the near half (z > 0), facing -z; -1: the far half, facing +z. */
    readonly sign: 1 | -1,
    offset: number,
  ) {
    this.root = player.root.position;
    player.root.rotation.y = sign === 1 ? 0 : Math.PI;
    player.plantFeet = true;
    this.readyOffset = offset;
    // Where each stroke meets the ball, relative to the player's root (facing -z).
    const saved = { p: player.root.position.clone(), r: player.root.rotation.y };
    player.root.position.set(0, 0, 0);
    player.root.rotation.y = 0;
    player.root.updateMatrixWorld(true);
    const pose = new Float32Array(CHANNELS);
    const local = (name: StrokeName) => {
      const clip = STROKES[name];
      sample(clip, clip.contact ?? 0, pose);
      return player.sweetSpot(pose, new Vector3());
    };
    this.contactLocal = {
      forehand: local("forehand"),
      backhand: local("backhand"),
      serve: local("serve"),
    };
    player.root.position.copy(saved.p);
    player.root.rotation.y = saved.r;
  }

  /** Root space → world for a direction/offset (the far player is turned 180°). */
  toWorld(local: Vector3): Vector3 {
    return new Vector3(local.x * this.sign, local.y, local.z * this.sign);
  }

  /** The player's right-hand side along world x. */
  lateralOf(worldX: number): number {
    return (worldX - this.root.x) * this.sign;
  }

  place(x: number, z: number): void {
    this.root.set(x, 0, z);
    this.move = null;
    this.action = null;
    this.player.root.updateMatrixWorld(true);
    sample(readyClip, 0, this.pose);
    this.player.resetFeet(this.pose);
  }

  moveTo(target: Vector3, start: number, end: number): void {
    this.move = {
      from: this.root.clone(),
      to: target.clone(),
      start,
      end: Math.max(end, start + 0.2),
    };
  }

  busy(now: number): boolean {
    const a = this.action;
    return a !== null && now < a.start + a.clip.duration / a.speed;
  }

  update(now: number, dt: number): void {
    // Root motion.
    const prev = this.root.clone();
    const m = this.move;
    if (m) {
      const u = Math.min(1, Math.max(0, (now - m.start) / (m.end - m.start)));
      const e = u * u * (3 - 2 * u);
      this.root.lerpVectors(m.from, m.to, e);
      if (u >= 1) this.move = null;
    }
    if (dt > 0) this.player.velocity.copy(this.root).sub(prev).divideScalar(dt);
    this.player.root.updateMatrixWorld(true);

    // Pose: the current action, or the ready position between shots.
    const a = this.action;
    if (a && now >= a.start && now < a.start + a.clip.duration / a.speed) {
      const t = (now - a.start) * a.speed;
      sample(a.clip, t, this.pose);
      if (a.clip.contact !== null) {
        const w = Math.exp(-(((t - a.clip.contact) / 0.2) ** 2));
        this.pose[9] = (this.pose[9] ?? 0) + a.adjust.x * w;
        this.pose[10] = (this.pose[10] ?? 0) + a.adjust.y * w;
        this.pose[11] = (this.pose[11] ?? 0) + a.adjust.z * w;
        // Low balls are taken with the legs, not only the arm.
        if (a.adjust.y < 0) this.pose[1] = (this.pose[1] ?? 0) + a.adjust.y * 0.45 * w;
      }
    } else {
      if (a && now >= a.start + a.clip.duration / a.speed) this.action = null;
      sample(readyClip, (now + this.readyOffset) % readyClip.duration, this.pose);
      // Running: lower and leaning into the movement.
      const speed = this.player.velocity.length();
      const run = Math.min(1, speed / 4);
      this.pose[1] = (this.pose[1] ?? 0) - 0.06 * run;
      this.pose[4] = (this.pose[4] ?? 0) + 10 * run;
      this.pose[7] = (this.pose[7] ?? 0) + 8 * run;
    }
    this.player.apply(this.pose, dt);
  }
}

type Flight = {
  state: BallState;
  /** Clock time of the planned return, and who plays it. */
  hitAt: number | null;
  hitter: Athlete | null;
  stroke: StrokeName | null;
  bounces: number;
};

type Toss = { from: Vector3; velocity: Vector3; release: number; contact: number; server: Athlete };

/**
 * Plays an endless match between the two players: a serve, a rally of physically simulated
 * shots (each landing where the hitter aimed it), movement to the ball with a split step, and a
 * winner that ends the point. Decisions come from a seeded generator, so the first seconds are
 * the same on every visit (and the reduced-motion still frame is stable).
 */
export class Rally {
  readonly athletes: [Athlete, Athlete];
  readonly ball: BallView;
  private now = 0;
  private flight: Flight | null = null;
  private toss: Toss | null = null;
  private waitingServe: { server: Athlete; at: number } | null = null;
  private deadUntil = 0;
  private points = 0;
  private shotsLeft = 0;
  private finalShot = false;
  private readonly random: () => number;
  private accumulator = 0;
  /** Contacts since the last call to `takeContacts` (the camera uses them). */
  private contacts = 0;
  readonly ballPosition = new Vector3(0, BALL_RADIUS, 0);
  ballVisible = false;

  constructor(near: Player, far: Player, ball: BallView, seed = 4) {
    this.athletes = [new Athlete(near, 1, 0), new Athlete(far, -1, 0.7)];
    this.ball = ball;
    this.random = rng(seed);
    this.startPoint();
  }

  get clock(): number {
    return this.now;
  }

  takeContacts(): number {
    const c = this.contacts;
    this.contacts = 0;
    return c;
  }

  get pointNumber(): number {
    return this.points;
  }

  /** Where the near player stands (the camera keeps them in frame). */
  get nearPosition(): Vector3 {
    return this.athletes[0].root;
  }

  private startPoint(): void {
    const serverIndex = Math.floor(this.points / 2) % 2;
    const server = this.athletes[serverIndex] ?? this.athletes[0];
    const receiver = this.athletes[1 - serverIndex] ?? this.athletes[1];
    const deuce = this.points % 2 === 0;
    // Deuce court: the server's right-hand side.
    const lateral = (deuce ? 0.75 : -0.75) * server.sign;
    server.place(lateral, server.sign * (COURT.halfLength + 0.3));
    receiver.place(-lateral * 3.6, receiver.sign * (COURT.halfLength + 0.9));
    this.ball.clearTrail();
    this.flight = null;
    this.toss = null;
    this.shotsLeft = 3 + Math.floor(this.random() * 6);
    this.finalShot = false;
    this.waitingServe = { server, at: this.now + 0.5 };
    this.ballVisible = true;
  }

  private beginServe(server: Athlete): void {
    const clip = STROKES.serve;
    const start = this.now;
    server.action = { clip, start, speed: 1, adjust: new Vector3() };
    const contact = start + (clip.contact ?? 1.5);
    const release = start + 0.95;
    const contactPoint = server.toWorld(server.contactLocal.serve).add(server.root);
    this.toss = {
      from: new Vector3(),
      velocity: new Vector3(),
      release,
      contact,
      server,
    };
    // The toss is solved when the hand lets go (see update): it must meet the strings exactly.
    this.tossTarget = contactPoint;
  }

  private tossTarget = new Vector3();

  private opponent(of: Athlete): Athlete {
    return of === this.athletes[0] ? this.athletes[1] : this.athletes[0];
  }

  /** Aims and launches a shot from `from` by `hitter`, then plans the opponent's reply. */
  private strike(hitter: Athlete, from: Vector3, serve: boolean): void {
    const receiver = this.opponent(hitter);
    const side = -hitter.sign;
    let target: Vector3;
    let rpm: number;
    let elevations: number[];
    if (serve) {
      // Diagonal service box: the side opposite the server's lateral position.
      const x = -Math.sign(from.x || 1) * (1.2 + this.random() * 2.2);
      target = new Vector3(x, 0, side * (COURT.serviceLine - 0.6 - this.random() * 1.6));
      rpm = 1500;
      elevations = [-5, -3.5, -2, 0, 2];
    } else if (this.finalShot) {
      // A winner into the corner away from the opponent.
      const away = receiver.root.x > 0 ? -1 : 1;
      target = new Vector3(
        away * (3.2 + this.random() * 0.6),
        0,
        side * (9.6 + this.random() * 1.4),
      );
      rpm = 1900;
      elevations = [7, 9, 11, 13];
    } else {
      target = new Vector3((this.random() * 2 - 1) * 2.9, 0, side * (6.6 + this.random() * 3));
      rpm = 1800 + this.random() * 900;
      elevations = [10, 12, 8, 14, 17];
    }
    let state: BallState | null = null;
    for (const elevationDeg of elevations) {
      state = solveShot({ from, target, elevationDeg, rpm, minSpeed: 9, maxSpeed: 58 });
      if (state) break;
    }
    if (!state)
      state = solveShot({ from, target, elevationDeg: 24, rpm: 900, minSpeed: 6, maxSpeed: 40 });
    if (!state) return;
    this.contacts++;
    this.flight = { state, hitAt: null, hitter: null, stroke: null, bounces: 0 };
    this.ball.clearTrail();
    if (!serve) {
      this.shotsLeft--;
      if (this.finalShot) {
        this.chaseWithoutReaching(receiver, state);
        return;
      }
      this.finalShot = this.shotsLeft <= 0;
    }
    this.planReturn(receiver, state);
  }

  /** Predicts the flight, picks the contact point and stroke, and sends the player there. */
  private planReturn(receiver: Athlete, state: BallState): void {
    const flight = simulate(state, 5, 2);
    const first = flight.bounces[0];
    if (!first) return;
    const pts = flight.points;
    const limitZ = COURT.halfLength + 2.4;
    let index = -1;
    const minIndex = Math.round(0.55 / STEP);
    for (let i = first.index + 2; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[i - 1];
      if (!p || !q) break;
      if (i < minIndex) continue;
      const descending = p.y < q.y;
      if ((descending && p.y <= 1.22) || Math.abs(p.z) >= limitZ) {
        index = i;
        break;
      }
    }
    if (index < 0) index = Math.min(pts.length - 1, first.index + Math.round(0.35 / STEP));
    const contactPoint = pts[index];
    if (!contactPoint) return;
    const contactAt = this.now + index * STEP;
    const stroke: StrokeName = receiver.lateralOf(contactPoint.x) > -0.25 ? "forehand" : "backhand";
    const clip = STROKES[stroke];
    const local = receiver.contactLocal[stroke];
    const target = contactPoint.clone().sub(receiver.toWorld(local));
    target.y = 0;
    target.x = Math.max(-7.5, Math.min(7.5, target.x));
    const along = Math.abs(target.z);
    target.z =
      receiver.sign * Math.max(COURT.halfLength - 2.5, Math.min(COURT.halfLength + 4.2, along));

    // Split step as the opponent strikes, then the run to the ball.
    if (!receiver.busy(this.now)) {
      receiver.action = { clip: splitStepClip, start: this.now, speed: 1, adjust: new Vector3() };
    }
    const moveStart = this.now + 0.3;
    const moveEnd = contactAt - (clip.contact ?? 0.86) * 0.5;
    receiver.moveTo(target, moveStart, moveEnd);

    const reach = contactPoint.clone().sub(target).sub(receiver.toWorld(local));
    const adjust = new Vector3(
      reach.x * receiver.sign,
      contactPoint.y - local.y,
      reach.z * receiver.sign,
    );
    let start = contactAt - (clip.contact ?? 0.86);
    let speed = 1;
    const earliest = this.now + 0.42;
    if (start < earliest) {
      speed = Math.min(1.8, (clip.contact ?? 0.86) / Math.max(0.2, contactAt - earliest));
      start = contactAt - (clip.contact ?? 0.86) / speed;
    }
    const plan = () => {
      receiver.action = { clip, start, speed, adjust };
    };
    this.pendingActions.push({ at: Math.min(start, this.now + 0.42), run: plan });
    if (this.flight) {
      this.flight.hitAt = contactAt;
      this.flight.hitter = receiver;
      this.flight.stroke = stroke;
    }
  }

  /** The last shot of the point: the opponent runs for it but cannot get there. */
  private chaseWithoutReaching(receiver: Athlete, state: BallState): void {
    const flight = simulate(state, 5, 1);
    const land = flight.bounces[0]?.pos;
    if (!receiver.busy(this.now)) {
      receiver.action = { clip: splitStepClip, start: this.now, speed: 1, adjust: new Vector3() };
    }
    if (land) {
      const toward = new Vector3(
        receiver.root.x + (land.x - receiver.root.x) * 0.55,
        0,
        receiver.root.z,
      );
      const time = Math.abs(toward.x - receiver.root.x) / (MAX_RUN_SPEED * 0.8);
      receiver.moveTo(toward, this.now + 0.35, this.now + 0.35 + Math.max(0.6, time));
    }
    this.deadUntil = this.now + 3.2;
  }

  private pendingActions: { at: number; run: () => void }[] = [];

  /** Advances the match by `dt` seconds (fixed physics steps inside). */
  update(dt: number): void {
    this.accumulator += Math.min(dt, 0.1);
    let stepped = false;
    while (this.accumulator >= STEP) {
      this.accumulator -= STEP;
      this.fixedStep();
      stepped = true;
    }
    const [near, far] = this.athletes;
    for (const a of this.athletes) a.player.lookAt(this.ballPosition);
    near.update(this.now, stepped ? dt : 0);
    far.update(this.now, stepped ? dt : 0);
    this.ball.update(this.ballPosition, this.flight?.state.spin ?? null, dt, this.flight !== null);
    this.ball.mesh.visible = this.ballVisible;
  }

  private fixedStep(): void {
    this.now += STEP;
    for (let i = this.pendingActions.length - 1; i >= 0; i--) {
      const p = this.pendingActions[i];
      if (p && this.now >= p.at) {
        p.run();
        this.pendingActions.splice(i, 1);
      }
    }

    const waiting = this.waitingServe;
    if (waiting && this.now >= waiting.at) {
      this.waitingServe = null;
      this.beginServe(waiting.server);
    }

    const toss = this.toss;
    if (toss) {
      if (this.now < toss.release) {
        toss.server.player.leftHandWorld(this.ballPosition);
        return;
      }
      if (toss.velocity.lengthSq() === 0) {
        toss.from.copy(this.ballPosition);
        const t = toss.contact - toss.release;
        toss.velocity
          .copy(this.tossTarget)
          .sub(toss.from)
          .addScaledVector(GRAVITY, -0.5 * t * t)
          .divideScalar(t);
      }
      const t = this.now - toss.release;
      this.ballPosition
        .copy(toss.from)
        .addScaledVector(toss.velocity, t)
        .addScaledVector(GRAVITY, 0.5 * t * t);
      if (this.now >= toss.contact) {
        this.toss = null;
        this.strike(toss.server, this.ballPosition.clone(), true);
      }
      return;
    }

    const flight = this.flight;
    if (!flight) {
      if (this.deadUntil > 0 && this.now >= this.deadUntil) this.nextPoint();
      return;
    }
    if (flight.hitAt !== null && this.now >= flight.hitAt && flight.hitter) {
      const hitter = flight.hitter;
      flight.hitAt = null;
      this.strike(hitter, flight.state.pos.clone(), false);
      return;
    }
    const bounce = stepBall(flight.state);
    const pos = flight.state.pos;
    // The fence stops the ball.
    if (Math.abs(pos.x) > COURT.surfaceHalfWidth - 0.1) {
      pos.x = Math.sign(pos.x) * (COURT.surfaceHalfWidth - 0.1);
      flight.state.vel.x *= -0.25;
    }
    if (Math.abs(pos.z) > COURT.surfaceHalfLength - 0.1) {
      pos.z = Math.sign(pos.z) * (COURT.surfaceHalfLength - 0.1);
      flight.state.vel.z *= -0.25;
    }
    if (bounce) {
      flight.bounces++;
      this.ball.bounce(bounce.pos, bounce.vel, bounce.vel.length() > 6);
    }
    this.ballPosition.copy(pos);
    if (this.deadUntil > 0 && this.now >= this.deadUntil) this.nextPoint();
  }

  private nextPoint(): void {
    this.deadUntil = 0;
    this.points++;
    this.pendingActions.length = 0;
    this.startPoint();
  }

  /**
   * Runs the match without drawing until the near player's next contact, for a still frame
   * (reduced motion) that shows a real stroke meeting the ball.
   */
  advanceToNearContact(maxSeconds = 20): void {
    const [near] = this.athletes;
    const limit = this.now + maxSeconds;
    while (this.now < limit) {
      this.update(1 / 60);
      const f = this.flight;
      if (
        f &&
        f.hitter === near &&
        f.hitAt !== null &&
        f.stroke === "forehand" &&
        f.hitAt - this.now < 1 / 60
      ) {
        this.update(Math.max(0, f.hitAt - this.now - STEP));
        return;
      }
    }
  }
}
