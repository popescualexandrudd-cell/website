import {
  CapsuleGeometry,
  CylinderGeometry,
  Euler,
  Group,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  Quaternion,
  SphereGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Texture,
} from "three";
import { buildRacket, RACKET, SWEET_SPOT } from "./racket";
import { CHANNELS } from "./pose";

/**
 * An articulated athlete built from smooth primitives, posed every frame from a pose vector
 * (see pose.ts). Positions are solved in the player's root space; elbows and knees come from
 * two-bone inverse kinematics with pole vectors, the head tracks the ball, and in free play the
 * feet stay planted on the clay and step only when the body needs them elsewhere.
 */

const DEG = Math.PI / 180;
const DOWN = new Vector3(0, -1, 0);
const UP = new Vector3(0, 1, 0);

export const BODY = {
  ankle: 0.085,
  shin: 0.43,
  thigh: 0.43,
  hipOffset: new Vector3(0.09, -0.07, 0),
  spine: new Vector3(0, 0.08, 0),
  shoulder: new Vector3(0.18, 0.39, 0.01),
  neck: new Vector3(0, 0.45, 0.01),
  upperArm: 0.3,
  forearm: 0.27,
};

export type Outfit = { shirt: number; shorts: number; cap: number; shoe: number };

/** Lathe profile for a limb hanging along -y: rounded ends, a gentle muscle bulge. */
function limb(length: number, r0: number, r1: number, bulge = 0.1, bulgeAt = 0.3): BufferGeometry {
  const pts: Vector2[] = [];
  for (let i = 4; i >= 1; i--) {
    const a = (i / 4) * (Math.PI / 2);
    pts.push(new Vector2(Math.cos(a) * r1, -length - Math.sin(a) * r1 * 0.7));
  }
  for (let i = 8; i >= 0; i--) {
    const s = i / 8;
    const r = (r0 + (r1 - r0) * s) * (1 + bulge * Math.exp(-((s - bulgeAt) ** 2) / 0.04));
    pts.push(new Vector2(r, -s * length));
  }
  for (let i = 1; i <= 4; i++) {
    const a = (i / 4) * (Math.PI / 2);
    pts.push(new Vector2(Math.cos(a) * r0, Math.sin(a) * r0 * 0.7));
  }
  pts.unshift(new Vector2(0, -length - r1 * 0.7));
  pts.push(new Vector2(0, r0 * 0.7));
  return new LatheGeometry(pts, 14);
}

/** Lathe from (radius, height) pairs, bottom to top, closed at both ends. */
function body(profile: [number, number][], depth: number): BufferGeometry {
  const pts = profile.map(([r, y]) => new Vector2(r, y));
  const first = profile[0];
  const last = profile.at(-1);
  if (first) pts.unshift(new Vector2(0, first[1]));
  if (last) pts.push(new Vector2(0, last[1]));
  const geometry = new LatheGeometry(pts, 20);
  geometry.scale(1, 1, depth);
  return geometry;
}

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

function place(object: Object3D, from: Vector3, to: Vector3): void {
  object.position.copy(from);
  const dir = to.clone().sub(from);
  if (dir.lengthSq() > 1e-10) object.quaternion.setFromUnitVectors(DOWN, dir.normalize());
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

type Foot = {
  planted: Vector3;
  plantedYaw: number;
  from: Vector3;
  fromYaw: number;
  progress: number;
  stepping: boolean;
  duration: number;
};

export class Player {
  readonly root = new Group();
  readonly racket: Group;
  private readonly pelvis: Mesh;
  private readonly chest: Mesh;
  private readonly neck: Mesh;
  private readonly head: Group;
  private readonly segments: Record<string, Object3D> = {};
  private readonly feet: Record<"l" | "r", Foot>;
  private readonly lookTarget = new Vector3(0, 1.2, -10);
  /** Feet follow the pose directly (technique lab) or plant and step (free play). */
  plantFeet = false;
  /** Root velocity in world space (m/s), so stepping feet land ahead of a moving body. */
  readonly velocity = new Vector3();
  private readonly lastLeftHand = new Vector3();

  constructor(outfit: Outfit, textures: { strings: Texture; grip: Texture }) {
    const skin = new MeshStandardMaterial({ color: 0xb98466, roughness: 0.62 });
    const shirt = new MeshStandardMaterial({ color: outfit.shirt, roughness: 0.78 });
    const shorts = new MeshStandardMaterial({ color: outfit.shorts, roughness: 0.8 });
    const shoe = new MeshStandardMaterial({ color: outfit.shoe, roughness: 0.55 });
    const sole = new MeshStandardMaterial({ color: 0xb8704a, roughness: 0.9 });
    const cap = new MeshStandardMaterial({ color: outfit.cap, roughness: 0.7 });
    const sock = new MeshStandardMaterial({ color: 0xf1eee8, roughness: 0.9 });

    this.pelvis = new Mesh(
      body(
        [
          [0.1, -0.15],
          [0.15, -0.1],
          [0.165, -0.02],
          [0.16, 0.06],
          [0.145, 0.12],
        ],
        0.72,
      ),
      shorts,
    );
    this.chest = new Mesh(
      body(
        [
          [0.135, -0.02],
          [0.14, 0.08],
          [0.15, 0.18],
          [0.168, 0.28],
          [0.172, 0.35],
          [0.16, 0.41],
          [0.1, 0.45],
          [0.05, 0.47],
        ],
        0.62,
      ),
      shirt,
    );
    this.neck = new Mesh(new CylinderGeometry(0.048, 0.055, 0.12, 12), skin);
    this.head = new Group();
    const skull = new Mesh(new SphereGeometry(0.105, 24, 16), skin);
    skull.scale.set(0.9, 1.1, 1);
    const capDome = new Mesh(
      new SphereGeometry(0.112, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42),
      cap,
    );
    capDome.scale.set(0.92, 1.05, 1.02);
    capDome.position.y = 0.02;
    const visor = new Mesh(new CylinderGeometry(0.1, 0.1, 0.012, 20, 1, false, -0.9, 1.8), cap);
    visor.position.set(0, 0.035, -0.07);
    visor.rotation.x = -0.12;
    visor.scale.set(0.9, 1, 0.9);
    this.head.add(skull, capDome, visor);

    const makeLimb = (
      name: string,
      length: number,
      r0: number,
      r1: number,
      material: MeshStandardMaterial,
      sleeve?: { material: MeshStandardMaterial; length: number; radius: number },
    ) => {
      const group = new Group();
      group.add(new Mesh(limb(length, r0, r1), material));
      if (sleeve) {
        const s = new Mesh(
          new CylinderGeometry(sleeve.radius, sleeve.radius * 0.94, sleeve.length, 14, 1, true),
          sleeve.material,
        );
        s.position.y = -sleeve.length / 2 + 0.02;
        group.add(s);
      }
      this.segments[name] = group;
      return group;
    };

    const parts: Object3D[] = [this.pelvis, this.chest, this.neck, this.head];
    for (const side of ["l", "r"] as const) {
      parts.push(
        makeLimb(`${side}UpperArm`, BODY.upperArm, 0.056, 0.043, skin, {
          material: shirt,
          length: 0.13,
          radius: 0.07,
        }),
        makeLimb(`${side}Forearm`, BODY.forearm, 0.046, 0.033, skin),
        makeLimb(`${side}Thigh`, BODY.thigh, 0.092, 0.06, skin, {
          material: shorts,
          length: 0.2,
          radius: 0.106,
        }),
        makeLimb(`${side}Shin`, BODY.shin, 0.062, 0.04, skin, {
          material: sock,
          length: 0.1,
          radius: 0.046,
        }),
      );
      const shoulder = new Mesh(new SphereGeometry(0.062, 16, 12), shirt);
      this.segments[`${side}Shoulder`] = shoulder;
      const hand = new Mesh(new SphereGeometry(1, 12, 10), skin);
      hand.scale.set(0.038, 0.06, 0.03);
      this.segments[`${side}Hand`] = hand;
      const foot = new Group();
      const upper = new Mesh(new CapsuleGeometry(0.047, 0.18, 4, 12), shoe);
      upper.rotation.x = Math.PI / 2;
      upper.scale.set(1, 1, 0.72);
      upper.position.set(0, 0.045, -0.06);
      const soleMesh = new Mesh(new CapsuleGeometry(0.05, 0.19, 2, 12), sole);
      soleMesh.rotation.x = Math.PI / 2;
      soleMesh.scale.set(1.02, 1, 0.22);
      soleMesh.position.set(0, 0.012, -0.06);
      foot.add(upper, soleMesh);
      this.segments[`${side}Foot`] = foot;
      parts.push(shoulder, hand, foot);
    }

    this.racket = buildRacket(textures, 0xc2562b);
    parts.push(this.racket);
    for (const part of parts) {
      part.traverse((o) => {
        if (o instanceof Mesh) o.castShadow = true;
      });
      this.root.add(part);
    }

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
    const hand = new Vector3(pose[9], pose[10], pose[11]);
    const dir = new Vector3(pose[12], pose[13], pose[14]).normalize();
    // The IK may shorten an over-extended arm; solve it to stay exact.
    const actual = this.solveArm("r", pose, hand);
    out.copy(actual).addScaledVector(dir, SWEET_SPOT);
    return this.root.localToWorld(out);
  }

  private chestFrame(pose: Float32Array): { origin: Vector3; q: Quaternion; pelvisQ: Quaternion } {
    const pelvisQ = new Quaternion().setFromEuler(
      new Euler((pose[4] ?? 0) * -DEG, (pose[3] ?? 0) * DEG, (pose[5] ?? 0) * DEG, "YXZ"),
    );
    const pelvisPos = new Vector3(pose[0], pose[1], pose[2]);
    const origin = BODY.spine.clone().applyQuaternion(pelvisQ).add(pelvisPos);
    const q = new Quaternion().setFromEuler(
      new Euler((pose[7] ?? 0) * -DEG, (pose[6] ?? 0) * DEG, (pose[8] ?? 0) * DEG, "YXZ"),
    );
    return { origin, q, pelvisQ };
  }

  private shoulderPos(side: "l" | "r", pose: Float32Array): Vector3 {
    const { origin, q } = this.chestFrame(pose);
    const offset = BODY.shoulder.clone();
    if (side === "l") offset.x *= -1;
    return offset.applyQuaternion(q).add(origin);
  }

  private solveArm(
    side: "l" | "r",
    pose: Float32Array,
    target: Vector3,
    elbowOut?: Vector3,
  ): Vector3 {
    const { q } = this.chestFrame(pose);
    const shoulder = this.shoulderPos(side, pose);
    const poleBase = side === "r" ? 18 : 26;
    const pole = new Vector3(
      pose[poleBase],
      pose[poleBase + 1],
      pose[poleBase + 2],
    ).applyQuaternion(q);
    const elbow = elbowOut ?? new Vector3();
    const end = new Vector3();
    solveTwoBone(shoulder, target, BODY.upperArm, BODY.forearm, pole, elbow, end);
    return end;
  }

  /** Poses the whole body. `dt` advances the stepping feet (0 = no time passes). */
  apply(pose: Float32Array, dt: number): void {
    if (pose.length < CHANNELS) return;
    const { origin, q, pelvisQ } = this.chestFrame(pose);
    const pelvisPos = new Vector3(pose[0], pose[1], pose[2]);
    this.pelvis.position.copy(pelvisPos);
    this.pelvis.quaternion.copy(pelvisQ);
    this.chest.position.copy(origin);
    this.chest.quaternion.copy(q);
    const neckBase = BODY.neck.clone().applyQuaternion(q).add(origin);
    this.neck.position.copy(neckBase).addScaledVector(UP.clone().applyQuaternion(q), 0.04);
    this.neck.quaternion.copy(q);

    // Head: turns towards the ball, within what a neck allows relative to the shoulders.
    const headPos = neckBase.clone().addScaledVector(UP.clone().applyQuaternion(q), 0.17);
    const look = this.root.worldToLocal(this.lookTarget.clone()).sub(headPos);
    const chestYaw = (pose[6] ?? 0) * DEG;
    let yaw = Math.atan2(-look.x, -look.z);
    let rel = yaw - chestYaw;
    rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    rel = Math.max(-1.3, Math.min(1.3, rel));
    yaw = chestYaw + rel;
    const pitch = Math.max(-0.7, Math.min(0.9, Math.atan2(look.y, Math.hypot(look.x, look.z))));
    this.head.position.copy(headPos);
    this.head.quaternion.setFromEuler(new Euler(pitch, yaw, 0, "YXZ"));

    // Racket arm.
    const hand = new Vector3(pose[9], pose[10], pose[11]);
    const dir = new Vector3(pose[12], pose[13], pose[14]).normalize();
    const face = new Vector3(pose[15], pose[16], pose[17]);
    const rElbow = new Vector3();
    const rHand = this.solveArm("r", pose, hand, rElbow);
    const rShoulder = this.shoulderPos("r", pose);
    const racketQ = racketQuaternion(dir, face, new Quaternion());
    this.racket.quaternion.copy(racketQ);
    this.racket.position.copy(rHand).addScaledVector(dir, -RACKET.gripAt);
    this.setArm("r", rShoulder, rElbow, rHand, racketQ);

    // Free arm: its own target, the handle above the right hand, or the throat.
    const leftFree = new Vector3(pose[21], pose[22], pose[23]);
    const onGrip = rHand.clone().addScaledVector(dir, 0.085);
    const onThroat = rHand
      .clone()
      .addScaledVector(dir, 0.25)
      .addScaledVector(new Vector3(0, 0, 1).applyQuaternion(racketQ), -0.02);
    const wGrip = pose[24] ?? 0;
    const wThroat = pose[25] ?? 0;
    const leftTarget = leftFree
      .multiplyScalar(Math.max(0, 1 - wGrip - wThroat))
      .addScaledVector(onGrip, wGrip)
      .addScaledVector(onThroat, wThroat);
    const lElbow = new Vector3();
    const lHand = this.solveArm("l", pose, leftTarget, lElbow);
    this.lastLeftHand.copy(lHand);
    const handQ =
      wGrip + wThroat > 0.5
        ? racketQ
        : new Quaternion().setFromUnitVectors(DOWN, lHand.clone().sub(lElbow).normalize());
    this.setArm("l", this.shoulderPos("l", pose), lElbow, lHand, handQ);

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
      const kneePole = footDir
        .clone()
        .multiplyScalar(1)
        .add(new Vector3(side === "l" ? -0.2 : 0.2, 0, 0));
      const knee = new Vector3();
      const end = new Vector3();
      solveTwoBone(hip, ankle, BODY.thigh, BODY.shin, kneePole, knee, end);
      const thigh = this.segments[`${side}Thigh`];
      const shin = this.segments[`${side}Shin`];
      const footMesh = this.segments[`${side}Foot`];
      if (thigh) place(thigh, hip, knee);
      if (shin) place(shin, knee, end);
      if (footMesh) {
        footMesh.position.set(end.x, end.y - BODY.ankle, end.z);
        footMesh.quaternion.setFromEuler(new Euler(-heel, footYaw, 0, "YXZ"));
      }
    }
  }

  private setArm(
    side: "l" | "r",
    shoulder: Vector3,
    elbow: Vector3,
    hand: Vector3,
    handQ: Quaternion,
  ): void {
    const upper = this.segments[`${side}UpperArm`];
    const fore = this.segments[`${side}Forearm`];
    const joint = this.segments[`${side}Shoulder`];
    const handMesh = this.segments[`${side}Hand`];
    if (upper) place(upper, shoulder, elbow);
    if (fore) place(fore, elbow, hand);
    if (joint) joint.position.copy(shoulder);
    if (handMesh) {
      handMesh.position.copy(hand);
      handMesh.quaternion.copy(handQ);
    }
  }

  /**
   * Where a foot is this frame. Lab mode: exactly the posed position. Free play: the foot
   * stays planted in world space until the pose wants it more than 12 cm (or 25°) away, then
   * steps there along a low arc, never while the other foot is in the air unless the body
   * is moving fast.
   */
  private footPosition(
    side: "l" | "r",
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
