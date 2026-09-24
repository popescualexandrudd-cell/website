import {
  Bone,
  DoubleSide,
  Euler,
  Group,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Quaternion,
  Skeleton,
  SkinnedMesh,
  Vector3,
  type Material,
  type Texture,
} from "three";
import { buildRacket, RACKET, SWEET_SPOT } from "./racket";
import { CHANNELS } from "./pose";
import { HUMAN } from "./humanRig";
import type { HumanAsset } from "./humanAsset";

/**
 * The athlete: a real human body (the MakeHuman base mesh, CC0, morphed into a young athletic
 * man and dressed; see scripts/build-3d-assets.ts) skinned to a light skeleton, posed every
 * frame from a pose vector (see pose.ts). Positions are solved in the player's root space;
 * elbows and knees come from two-bone inverse kinematics with pole vectors, the right hand
 * holds the racket (the left joins it for two-handed shots), the head tracks the ball, and in
 * free play the feet stay planted on the clay and step only when the body needs them elsewhere.
 */

const DEG = Math.PI / 180;
const DOWN = new Vector3(0, -1, 0);
const UP = new Vector3(0, 1, 0);
const FORWARD = new Vector3(0, 0, -1);
const v3 = (a: readonly number[]) => new Vector3(a[0], a[1], a[2]);

/** Body measurements, from the model's rest pose (metres). */
export const BODY = {
  ankle: HUMAN.body.ankle,
  shin: HUMAN.body.shin,
  thigh: HUMAN.body.thigh,
  hipOffset: v3(HUMAN.body.hipOffset),
  spine: v3(HUMAN.body.spine),
  shoulder: v3(HUMAN.body.shoulder),
  neck: v3(HUMAN.body.neck),
  head: v3(HUMAN.body.head),
  upperArm: HUMAN.body.upperArm,
  forearm: HUMAN.body.forearm,
};

/**
 * The strokes were keyed for a standing pelvis height of 1.015 m; this body stands a little
 * taller, so every pose is lifted by the difference (same knee bend, same reach).
 */
const PELVIS_LIFT = BODY.ankle + BODY.thigh + BODY.shin - BODY.hipOffset.y - 1.015;

export type Outfit = { shirt: number; shorts: number; shoe: number };

type Side = "l" | "r";
const BONE_NAMES = [
  "pelvis",
  "spine",
  "chest",
  "neck",
  "head",
  "lUpperArm",
  "lForearm",
  "lHand",
  "rUpperArm",
  "rForearm",
  "rHand",
  "lThigh",
  "lShin",
  "lFoot",
  "rThigh",
  "rShin",
  "rFoot",
] as const;
type BoneName = (typeof BONE_NAMES)[number];

/** Two-bone IK: returns the middle joint and the reachable end for a chain root → target. */
function solveTwoBone(
  root: Vector3,
  target: Vector3,
  a: number,
  b: number,
  pole: Vector3,
  outMid: Vector3,
  outEnd: Vector3,
): void {
  const d = target.clone().sub(root);
  const dist = Math.min(Math.max(d.length(), Math.abs(a - b) + 1e-3), a + b - 1e-4);
  const dir = d.lengthSq() > 1e-10 ? d.normalize() : DOWN.clone();
  const cosA = (a * a + dist * dist - b * b) / (2 * a * dist);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const p = pole.clone().addScaledVector(dir, -pole.dot(dir));
  if (p.lengthSq() < 1e-8) p.set(0, 0, -1).addScaledVector(dir, -dir.z);
  p.normalize();
  outMid
    .copy(root)
    .addScaledVector(dir, a * cosA)
    .addScaledVector(p, a * sinA);
  outEnd.copy(root).addScaledVector(dir, dist);
}

/** Rotation whose columns are the given axes. */
function basis(x: Vector3, y: Vector3, z: Vector3, out = new Quaternion()): Quaternion {
  return out.setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
}

/**
 * The frame of a hinged limb segment from → to: +y along the segment, +x the hinge (the axis
 * the elbow or knee bends about, from the IK pole), +z completing the frame. Stable even when
 * the limb is straight, because the hinge comes from the pole, not from the bend.
 */
function hingeAxis(from: Vector3, end: Vector3, pole: Vector3): Vector3 {
  const d = end.clone().sub(from).normalize();
  const p = pole.clone().addScaledVector(d, -pole.dot(d));
  if (p.lengthSq() < 1e-8) p.copy(FORWARD).addScaledVector(d, -FORWARD.dot(d));
  return p.normalize().cross(d).normalize();
}
function segmentFrame(from: Vector3, to: Vector3, hinge: Vector3, out = new Quaternion()) {
  const y = to.clone().sub(from).normalize();
  const x = hinge.clone().addScaledVector(y, -hinge.dot(y)).normalize();
  const z = new Vector3().crossVectors(x, y);
  return basis(x, y, z, out);
}

/** Racket orientation: +y along the racket axis, +z along the string-bed normal. */
function racketQuaternion(dir: Vector3, face: Vector3, out: Quaternion): Quaternion {
  const y = dir.clone().normalize();
  const z = face.clone().addScaledVector(y, -face.dot(y));
  if (z.lengthSq() < 1e-6) z.set(1, 0, 0).addScaledVector(y, -y.x);
  z.normalize();
  const x = new Vector3().crossVectors(y, z);
  return out.setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
}

/** Signed angle of `v` around `axis`, measured from `ref` (both projected on the plane). */
function angleAround(v: Vector3, ref: Vector3, axis: Vector3): number {
  const a = v.clone().addScaledVector(axis, -v.dot(axis));
  const b = ref.clone().addScaledVector(axis, -ref.dot(axis));
  return Math.atan2(new Vector3().crossVectors(b, a).dot(axis), a.dot(b));
}
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Rest-pose data of the skeleton, shared by every player. */
const REST = (() => {
  const r = HUMAN.rest;
  const joint = {
    pelvis: v3(r.pelvis),
    chest: v3(r.chest),
    neck: v3(r.neck),
    head: v3(r.head),
    lShoulder: v3(r.lShoulder),
    lElbow: v3(r.lElbow),
    lWrist: v3(r.lWrist),
    rShoulder: v3(r.rShoulder),
    rElbow: v3(r.rElbow),
    rWrist: v3(r.rWrist),
    lHip: v3(r.lHip),
    lKnee: v3(r.lKnee),
    lAnkle: v3(r.lAnkle),
    lToe: v3(r.lToe),
    rHip: v3(r.rHip),
    rKnee: v3(r.rKnee),
    rAnkle: v3(r.rAnkle),
    rToe: v3(r.rToe),
  };
  const grip = (s: Side) => {
    const g = HUMAN.grip[s];
    const q = basis(v3(g.x), v3(g.y), v3(g.z));
    const origin = v3(g.origin);
    const wrist = s === "l" ? joint.lWrist : joint.rWrist;
    // Where the wrist sits in the hand's (racket) frame.
    const wristInHand = wrist.clone().sub(origin).applyQuaternion(q.clone().invert());
    return { q, origin, wristInHand };
  };
  const arm = (s: Side) => {
    const shoulder = s === "l" ? joint.lShoulder : joint.rShoulder;
    const elbow = s === "l" ? joint.lElbow : joint.rElbow;
    const wrist = s === "l" ? joint.lWrist : joint.rWrist;
    // The rest elbow is bent: its offset from the shoulder–wrist line is the rest pole.
    const d = wrist.clone().sub(shoulder).normalize();
    const pole = elbow.clone().sub(shoulder);
    pole.addScaledVector(d, -pole.dot(d));
    const hinge = hingeAxis(shoulder, wrist, pole);
    return {
      upper: segmentFrame(shoulder, elbow, hinge),
      fore: segmentFrame(elbow, wrist, hinge),
    };
  };
  const leg = (s: Side) => {
    const hip = s === "l" ? joint.lHip : joint.rHip;
    const knee = s === "l" ? joint.lKnee : joint.rKnee;
    const ankle = s === "l" ? joint.lAnkle : joint.rAnkle;
    const toe = s === "l" ? joint.lToe : joint.rToe;
    const hinge = hingeAxis(hip, ankle, FORWARD);
    const along = toe.clone().sub(ankle);
    const yaw = Math.atan2(-along.x, -along.z);
    return {
      thigh: segmentFrame(hip, knee, hinge),
      shin: segmentFrame(knee, ankle, hinge),
      foot: new Quaternion().setFromAxisAngle(UP, yaw),
    };
  };
  const I = new Quaternion();
  const frames: Record<BoneName, { origin: Vector3; q: Quaternion }> = {
    pelvis: { origin: joint.pelvis, q: I },
    spine: { origin: joint.chest, q: I },
    chest: { origin: joint.chest, q: I },
    neck: { origin: joint.neck, q: I },
    head: { origin: joint.head, q: I },
    lUpperArm: { origin: joint.lShoulder, q: arm("l").upper },
    lForearm: { origin: joint.lElbow, q: arm("l").fore },
    lHand: { origin: grip("l").origin, q: grip("l").q },
    rUpperArm: { origin: joint.rShoulder, q: arm("r").upper },
    rForearm: { origin: joint.rElbow, q: arm("r").fore },
    rHand: { origin: grip("r").origin, q: grip("r").q },
    lThigh: { origin: joint.lHip, q: leg("l").thigh },
    lShin: { origin: joint.lKnee, q: leg("l").shin },
    lFoot: { origin: joint.lAnkle, q: leg("l").foot },
    rThigh: { origin: joint.rHip, q: leg("r").thigh },
    rShin: { origin: joint.rKnee, q: leg("r").shin },
    rFoot: { origin: joint.rAnkle, q: leg("r").foot },
  };
  // How the relaxed hand sits on the forearm (used when the left hand is free).
  const handOnForearm = (s: Side) =>
    frames[s === "l" ? "lForearm" : "rForearm"].q.clone().invert().multiply(frames[`${s}Hand`].q);
  const handOffset = (s: Side) =>
    frames[`${s}Hand`].origin
      .clone()
      .sub(s === "l" ? joint.lWrist : joint.rWrist)
      .applyQuaternion(frames[`${s}Hand`].q.clone().invert());
  return {
    frames,
    grip: { l: grip("l"), r: grip("r") },
    handOnForearm: { l: handOnForearm("l"), r: handOnForearm("r") },
    handOffset: { l: handOffset("l"), r: handOffset("r") },
  };
})();

type Foot = {
  planted: Vector3;
  plantedYaw: number;
  from: Vector3;
  fromYaw: number;
  progress: number;
  stepping: boolean;
  duration: number;
};

type Materials = Material[];

function outfitMaterials(outfit: Outfit, detail: "high" | "low"): Materials {
  const physical = detail === "high";
  const fabric = (color: number) =>
    physical
      ? new MeshPhysicalMaterial({
          color,
          roughness: 0.86,
          sheen: 0.7,
          sheenRoughness: 0.55,
          sheenColor: 0xffffff,
          side: DoubleSide,
        })
      : new MeshStandardMaterial({ color, roughness: 0.86, side: DoubleSide });
  const skin = physical
    ? new MeshPhysicalMaterial({
        color: 0xd29a7c,
        roughness: 0.5,
        sheen: 0.35,
        sheenRoughness: 0.6,
        sheenColor: 0xff8a6a,
        clearcoat: 0.08,
        clearcoatRoughness: 0.55,
        vertexColors: true,
      })
    : new MeshStandardMaterial({ color: 0xd29a7c, roughness: 0.55, vertexColors: true });
  const shoes = physical
    ? new MeshPhysicalMaterial({
        color: outfit.shoe,
        roughness: 0.48,
        clearcoat: 0.35,
        clearcoatRoughness: 0.4,
        vertexColors: true,
        side: DoubleSide,
      })
    : new MeshStandardMaterial({ color: outfit.shoe, roughness: 0.5, vertexColors: true });
  const hair = new MeshStandardMaterial({ color: 0x2b1e16, roughness: 0.82 });
  const eyes = physical
    ? new MeshPhysicalMaterial({
        roughness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        vertexColors: true,
      })
    : new MeshStandardMaterial({ roughness: 0.2, vertexColors: true });
  // Order: skin, shirt, shorts, socks, shoes, hair, eyes (HUMAN_MATERIALS).
  return [skin, fabric(outfit.shirt), fabric(outfit.shorts), fabric(0xf4f2ee), shoes, hair, eyes];
}

export class Player {
  readonly root = new Group();
  readonly racket: Group;
  private readonly body: SkinnedMesh;
  private readonly bones: Record<BoneName, Bone>;
  private readonly feet: Record<Side, Foot>;
  private readonly lookTarget = new Vector3(0, 1.2, -10);
  /** Feet follow the pose directly (technique lab) or plant and step (free play). */
  plantFeet = false;
  /** Root velocity in world space (m/s), so stepping feet land ahead of a moving body. */
  readonly velocity = new Vector3();
  private readonly lastLeftHand = new Vector3();
  /** Which way round each hand holds the racket (the racket's two faces look the same). */
  private readonly palmFlip: Record<Side, boolean> = { l: false, r: false };

  constructor(
    outfit: Outfit,
    textures: { strings: Texture; grip: Texture },
    human: HumanAsset,
    detail: "high" | "low" = "high",
  ) {
    const bones = {} as Record<BoneName, Bone>;
    const inverses: Matrix4[] = [];
    const list: Bone[] = [];
    for (const name of human.bones as readonly string[]) {
      if (!(BONE_NAMES as readonly string[]).includes(name)) throw new Error(`bone ${name}`);
      const bone = new Bone();
      bone.name = name;
      const rest = REST.frames[name as BoneName];
      bone.position.copy(rest.origin);
      bone.quaternion.copy(rest.q);
      inverses.push(new Matrix4().compose(rest.origin, rest.q, new Vector3(1, 1, 1)).invert());
      bones[name as BoneName] = bone;
      list.push(bone);
      this.root.add(bone);
    }
    this.bones = bones;
    this.body = new SkinnedMesh(human.geometry, outfitMaterials(outfit, detail));
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    // The players never leave the court; skip per-frame bounds of the moving skeleton.
    this.body.frustumCulled = false;
    this.root.add(this.body);
    this.body.bind(new Skeleton(list, inverses), new Matrix4());

    this.racket = buildRacket(textures, 0xc2562b);
    this.racket.traverse((o) => {
      if (o instanceof Mesh) o.castShadow = true;
    });
    this.root.add(this.racket);

    const foot = (): Foot => ({
      planted: new Vector3(),
      plantedYaw: 0,
      from: new Vector3(),
      fromYaw: 0,
      progress: 1,
      stepping: false,
      duration: 0.2,
    });
    this.feet = { l: foot(), r: foot() };
  }

  /** Sets where the head looks (world space). */
  lookAt(world: Vector3): void {
    this.lookTarget.copy(world);
  }

  /** Puts both feet exactly where the pose wants them (after a teleport or a mode change). */
  resetFeet(pose: Float32Array): void {
    for (const side of ["l", "r"] as const) {
      const base = side === "l" ? 29 : 33;
      const local = new Vector3(pose[base] ?? 0, 0, pose[base + 1] ?? 0);
      const f = this.feet[side];
      f.planted.copy(this.root.localToWorld(local));
      f.plantedYaw = (pose[base + 2] ?? 0) * DEG + this.root.rotation.y;
      f.stepping = false;
      f.progress = 1;
    }
  }

  /** The free hand's position after the last `apply`, in world space (holds the ball to serve). */
  leftHandWorld(out: Vector3): Vector3 {
    return this.root.localToWorld(out.copy(this.lastLeftHand));
  }

  /** The sweet spot, in world space, for a pose (used to line the ball up with the strings). */
  sweetSpot(pose: Float32Array, out: Vector3): Vector3 {
    const dir = new Vector3(pose[12], pose[13], pose[14]).normalize();
    // Planning only: the hand's way round the handle is not changed by looking ahead.
    const grip = this.racketHand(pose, false).grip;
    out.copy(grip).addScaledVector(dir, SWEET_SPOT);
    return this.root.localToWorld(out);
  }

  private chestFrame(pose: Float32Array): { origin: Vector3; q: Quaternion; pelvisQ: Quaternion } {
    const pelvisQ = new Quaternion().setFromEuler(
      new Euler((pose[4] ?? 0) * -DEG, (pose[3] ?? 0) * DEG, (pose[5] ?? 0) * DEG, "YXZ"),
    );
    const pelvisPos = new Vector3(pose[0], (pose[1] ?? 0) + PELVIS_LIFT, pose[2]);
    const origin = BODY.spine.clone().applyQuaternion(pelvisQ).add(pelvisPos);
    const q = new Quaternion().setFromEuler(
      new Euler((pose[7] ?? 0) * -DEG, (pose[6] ?? 0) * DEG, (pose[8] ?? 0) * DEG, "YXZ"),
    );
    return { origin, q, pelvisQ };
  }

  private shoulderPos(side: Side, pose: Float32Array): Vector3 {
    const { origin, q } = this.chestFrame(pose);
    const offset = BODY.shoulder.clone();
    if (side === "l") offset.x *= -1;
    return offset.applyQuaternion(q).add(origin);
  }

  private armPole(side: Side, pose: Float32Array): Vector3 {
    const { q } = this.chestFrame(pose);
    const base = side === "r" ? 18 : 26;
    return new Vector3(pose[base], pose[base + 1], pose[base + 2]).applyQuaternion(q);
  }

  /**
   * Solves an arm whose hand holds the racket at `grip` with orientation `racketQ`. The racket
   * looks the same from both faces, so the hand may hold it either way round: it keeps the
   * way that twists the forearm least (with some hysteresis, so it never flips mid-swing).
   */
  private holdRacket(
    side: Side,
    pose: Float32Array,
    grip: Vector3,
    racketQ: Quaternion,
    commit = true,
  ) {
    const shoulder = this.shoulderPos(side, pose);
    const pole = this.armPole(side, pose);
    const rest = REST.grip[side];
    const flipQ = racketQ.clone().multiply(new Quaternion().setFromAxisAngle(UP, Math.PI));
    const solve = (handQ: Quaternion) => {
      const wrist = rest.wristInHand.clone().applyQuaternion(handQ).add(grip);
      const elbow = new Vector3();
      const end = new Vector3();
      solveTwoBone(shoulder, wrist, BODY.upperArm, BODY.forearm, pole, elbow, end);
      const hinge = hingeAxis(shoulder, end, pole);
      const foreQ = segmentFrame(elbow, end, hinge);
      const twist = this.forearmTwist(side, foreQ, handQ, elbow, end);
      return { handQ, wrist: end, elbow, hinge, foreQ, twist, reach: wrist.distanceTo(end) };
    };
    const kept = solve(this.palmFlip[side] ? flipQ : racketQ);
    const other = solve(this.palmFlip[side] ? racketQ : flipQ);
    // Prefer the hold that lets the hand reach the grip, then the one that twists least.
    const cost = (c: { twist: number; reach: number }) => Math.abs(c.twist) + c.reach * 25;
    const switchHands = cost(other) + 25 * DEG < cost(kept);
    if (switchHands && commit) this.palmFlip[side] = !this.palmFlip[side];
    const best = switchHands ? other : kept;
    // Out of reach: the hand follows the arm instead of floating off it.
    const actualGrip = rest.wristInHand
      .clone()
      .applyQuaternion(best.handQ)
      .negate()
      .add(best.wrist);
    return { ...best, shoulder, grip: best.reach > 1e-4 ? actualGrip : grip.clone() };
  }

  /** How far the hand is turned about the forearm, relative to the rest pose. */
  private forearmTwist(
    side: Side,
    foreQ: Quaternion,
    handQ: Quaternion,
    elbow: Vector3,
    wrist: Vector3,
  ): number {
    const axis = wrist.clone().sub(elbow).normalize();
    const restRel = REST.handOnForearm[side];
    // Where the hand's x axis would be with no twist (rest relation), and where it is.
    const neutral = new Vector3(1, 0, 0).applyQuaternion(foreQ.clone().multiply(restRel));
    const actual = new Vector3(1, 0, 0).applyQuaternion(handQ);
    return wrap(angleAround(actual, neutral, axis));
  }

  private racketHand(pose: Float32Array, commit = true) {
    const hand = new Vector3(pose[9], pose[10], pose[11]);
    const dir = new Vector3(pose[12], pose[13], pose[14]).normalize();
    const face = new Vector3(pose[15], pose[16], pose[17]);
    const racketQ = racketQuaternion(dir, face, new Quaternion());
    return { racketQ, dir, ...this.holdRacket("r", pose, hand, racketQ, commit) };
  }

  /** Poses the whole body. `dt` advances the stepping feet (0 = no time passes). */
  apply(pose: Float32Array, dt: number): void {
    if (pose.length < CHANNELS) return;
    const b = this.bones;
    const { origin, q, pelvisQ } = this.chestFrame(pose);
    const pelvisPos = new Vector3(pose[0], (pose[1] ?? 0) + PELVIS_LIFT, pose[2]);
    b.pelvis.position.copy(pelvisPos);
    b.pelvis.quaternion.copy(pelvisQ);
    b.spine.position.copy(origin);
    b.spine.quaternion.copy(pelvisQ).slerp(q, 0.5);
    b.chest.position.copy(origin);
    b.chest.quaternion.copy(q);
    const neckBase = BODY.neck.clone().applyQuaternion(q).add(origin);
    const headPos = BODY.head.clone().applyQuaternion(q).add(neckBase);

    // Head: turns towards the ball, within what a neck allows relative to the shoulders.
    const look = this.root.worldToLocal(this.lookTarget.clone()).sub(headPos);
    const chestYaw = (pose[6] ?? 0) * DEG;
    let yaw = Math.atan2(-look.x, -look.z);
    let rel = yaw - chestYaw;
    rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    rel = Math.max(-1.3, Math.min(1.3, rel));
    yaw = chestYaw + rel;
    const pitch = Math.max(-0.7, Math.min(0.9, Math.atan2(look.y, Math.hypot(look.x, look.z))));
    const headQ = new Quaternion().setFromEuler(new Euler(pitch * 0.8, yaw, 0, "YXZ"));
    b.neck.position.copy(neckBase);
    b.neck.quaternion.copy(q).slerp(headQ, 0.45);
    b.head.position.copy(headPos);
    b.head.quaternion.copy(headQ);

    // Racket arm: the hand holds the racket at the pose's grip point.
    const right = this.racketHand(pose);
    this.racket.quaternion.copy(right.racketQ);
    this.racket.position.copy(right.grip).addScaledVector(right.dir, -RACKET.gripAt);
    this.setArm(
      "r",
      right.shoulder,
      right.elbow,
      right.wrist,
      right.hinge,
      right.handQ,
      right.grip,
    );

    // Free arm: its own target, the handle above the right hand, or the throat.
    const wGrip = pose[24] ?? 0;
    const wThroat = pose[25] ?? 0;
    const held = Math.min(1, wGrip + wThroat);
    const onGrip = right.grip.clone().addScaledVector(right.dir, 0.095);
    const onThroat = right.grip
      .clone()
      .addScaledVector(right.dir, 0.25)
      .addScaledVector(new Vector3(0, 0, 1).applyQuaternion(right.racketQ), -0.02);
    const lShoulder = this.shoulderPos("l", pose);
    const lPole = this.armPole("l", pose);
    let lElbow = new Vector3();
    let lWrist = new Vector3();
    let lHinge: Vector3;
    let lHandQ: Quaternion;
    let lGrip: Vector3;
    if (held > 0.02) {
      const target =
        wGrip + wThroat > 0
          ? onGrip
              .clone()
              .multiplyScalar(wGrip / (wGrip + wThroat))
              .addScaledVector(onThroat, wThroat / (wGrip + wThroat))
          : onGrip;
      const holding = this.holdRacket("l", pose, target, right.racketQ);
      if (held < 0.98) {
        // Letting go or taking hold: blend with the free hand.
        const free = this.freeHand(pose, lShoulder, lPole);
        lElbow = free.elbow.lerp(holding.elbow, held);
        lWrist = free.wrist.lerp(holding.wrist, held);
        lHinge = free.hinge.lerp(holding.hinge, held).normalize();
        lHandQ = free.handQ.slerp(holding.handQ, held);
        lGrip = free.grip.lerp(holding.grip, held);
      } else {
        lElbow = holding.elbow;
        lWrist = holding.wrist;
        lHinge = holding.hinge;
        lHandQ = holding.handQ;
        lGrip = holding.grip;
      }
    } else {
      const free = this.freeHand(pose, lShoulder, lPole);
      lElbow = free.elbow;
      lWrist = free.wrist;
      lHinge = free.hinge;
      lHandQ = free.handQ;
      lGrip = free.grip;
    }
    this.lastLeftHand.copy(lGrip);
    this.setArm("l", lShoulder, lElbow, lWrist, lHinge, lHandQ, lGrip);

    // Legs.
    for (const side of ["l", "r"] as const) {
      const base = side === "l" ? 29 : 33;
      const hip = BODY.hipOffset.clone();
      if (side === "l") hip.x *= -1;
      hip.applyQuaternion(pelvisQ).add(pelvisPos);
      const wantLocal = new Vector3(pose[base] ?? 0, 0, pose[base + 1] ?? 0);
      const wantYaw = (pose[base + 2] ?? 0) * DEG;
      const heel = Math.max(0, (pose[base + 3] ?? 0) * DEG);
      const { position, yaw: footYaw, lift } = this.footPosition(side, wantLocal, wantYaw, dt);
      const ankle = position.clone();
      ankle.y = BODY.ankle + Math.sin(heel) * 0.14 + lift;
      const footDir = new Vector3(-Math.sin(footYaw), 0, -Math.cos(footYaw));
      const kneePole = footDir.clone().add(new Vector3(side === "l" ? -0.2 : 0.2, 0, 0));
      const knee = new Vector3();
      const end = new Vector3();
      solveTwoBone(hip, ankle, BODY.thigh, BODY.shin, kneePole, knee, end);
      const hinge = hingeAxis(hip, end, kneePole);
      const thigh = b[`${side}Thigh`];
      const shin = b[`${side}Shin`];
      const foot = b[`${side}Foot`];
      thigh.position.copy(hip);
      segmentFrame(hip, knee, hinge, thigh.quaternion);
      shin.position.copy(knee);
      segmentFrame(knee, end, hinge, shin.quaternion);
      foot.position.copy(end);
      foot.quaternion.setFromEuler(new Euler(-heel, footYaw, 0, "YXZ"));
    }
  }

  /** A free left hand: the pose's target is the palm; the wrist stays straight. */
  private freeHand(pose: Float32Array, shoulder: Vector3, pole: Vector3) {
    const target = new Vector3(pose[21], pose[22], pose[23]);
    const reachDir = target.clone().sub(shoulder).normalize();
    const palm = REST.handOffset.l.length();
    const wristTarget = target.clone().addScaledVector(reachDir, -palm);
    const elbow = new Vector3();
    const wrist = new Vector3();
    solveTwoBone(shoulder, wristTarget, BODY.upperArm, BODY.forearm, pole, elbow, wrist);
    const hinge = hingeAxis(shoulder, wrist, pole);
    const foreQ = segmentFrame(elbow, wrist, hinge);
    const handQ = foreQ.clone().multiply(REST.handOnForearm.l);
    const grip = REST.handOffset.l.clone().applyQuaternion(handQ).add(wrist);
    return { elbow, wrist, hinge, handQ, grip };
  }

  private setArm(
    side: Side,
    shoulder: Vector3,
    elbow: Vector3,
    wrist: Vector3,
    hinge: Vector3,
    handQ: Quaternion,
    grip: Vector3,
  ): void {
    const upper = this.bones[`${side}UpperArm`];
    const fore = this.bones[`${side}Forearm`];
    const hand = this.bones[`${side}Hand`];
    upper.position.copy(shoulder);
    segmentFrame(shoulder, elbow, hinge, upper.quaternion);
    fore.position.copy(elbow);
    segmentFrame(elbow, wrist, hinge, fore.quaternion);
    // Half of the hand's turn is taken by the forearm (pronation), so the wrist never wrings.
    const twist = this.forearmTwist(side, fore.quaternion, handQ, elbow, wrist);
    const axis = wrist.clone().sub(elbow).normalize();
    fore.quaternion.premultiply(new Quaternion().setFromAxisAngle(axis, twist * 0.5));
    hand.position.copy(grip);
    hand.quaternion.copy(handQ);
  }

  /**
   * Where a foot is this frame. Lab mode: exactly the posed position. Free play: the foot
   * stays planted in world space until the pose wants it more than 12 cm (or 25°) away, then
   * steps there along a low arc, never while the other foot is in the air unless the body
   * is moving fast.
   */
  private footPosition(
    side: Side,
    wantLocal: Vector3,
    wantYaw: number,
    dt: number,
  ): { position: Vector3; yaw: number; lift: number } {
    if (!this.plantFeet) return { position: wantLocal, yaw: wantYaw, lift: 0 };
    const foot = this.feet[side];
    const other = this.feet[side === "l" ? "r" : "l"];
    const wantWorld = this.root.localToWorld(wantLocal.clone());
    // Lead the step: land where the body will be, not where it was.
    wantWorld.addScaledVector(
      this.velocity,
      foot.stepping ? foot.duration * (1 - foot.progress) * 0.8 : 0.16,
    );
    wantWorld.y = 0;
    const wantWorldYaw = wantYaw + this.root.rotation.y;
    if (!foot.stepping) {
      const far = foot.planted.distanceTo(wantWorld) > 0.12;
      const turned = Math.abs(wantWorldYaw - foot.plantedYaw) > 25 * DEG;
      const hurry = this.velocity.lengthSq() > 4;
      if ((far || turned) && (!other.stepping || (hurry && other.progress > 0.5))) {
        foot.stepping = true;
        foot.progress = 0;
        foot.from.copy(foot.planted);
        foot.fromYaw = foot.plantedYaw;
        foot.duration = Math.min(0.28, Math.max(0.13, foot.planted.distanceTo(wantWorld) / 2.8));
      }
    }
    let lift = 0;
    if (foot.stepping) {
      foot.progress = Math.min(1, foot.progress + dt / foot.duration);
      const u = foot.progress;
      const e = u * u * (3 - 2 * u);
      foot.planted.lerpVectors(foot.from, wantWorld, e);
      foot.plantedYaw = foot.fromYaw + (wantWorldYaw - foot.fromYaw) * e;
      lift = Math.sin(Math.PI * u) * Math.min(0.1, 0.03 + foot.from.distanceTo(wantWorld) * 0.08);
      if (u >= 1) foot.stepping = false;
    }
    const local = this.root.worldToLocal(foot.planted.clone());
    local.y = 0;
    return { position: local, yaw: foot.plantedYaw - this.root.rotation.y, lift };
  }
}
