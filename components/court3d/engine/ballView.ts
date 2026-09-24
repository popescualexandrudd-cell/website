import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Texture,
} from "three";
import { BALL_RADIUS } from "./ball";
import { ballMarkTexture, ballTexture, dustTexture } from "./textures";

const MARKS = 14;
const DUST = 48;
const TRAIL = 36;

/**
 * Everything the ball draws: the felt ball itself (spinning with its real angular velocity),
 * a fading trail, the oval prints it leaves on the clay and the puff of dust at each bounce.
 */
export class BallView {
  readonly group = new Group();
  readonly mesh: Mesh;
  private readonly marks: Mesh[] = [];
  private markIndex = 0;
  private readonly dust: Points;
  private readonly dustVel: Vector3[] = [];
  private readonly dustAge = new Float32Array(DUST);
  private dustNext = 0;
  private readonly trail: Line;
  private readonly trailPoints: Vector3[] = [];
  readonly path: Line;
  readonly textures: Texture[];

  constructor() {
    const felt = ballTexture();
    const mark = ballMarkTexture();
    const puff = dustTexture();
    this.textures = [felt, mark, puff];

    this.mesh = new Mesh(
      new SphereGeometry(BALL_RADIUS, 24, 16),
      new MeshStandardMaterial({ map: felt, roughness: 0.95 }),
    );
    this.mesh.castShadow = true;
    this.group.add(this.mesh);

    const markGeometry = new PlaneGeometry(0.07, 0.16);
    markGeometry.rotateX(-Math.PI / 2);
    for (let i = 0; i < MARKS; i++) {
      const m = new Mesh(
        markGeometry,
        new MeshBasicMaterial({
          map: mark,
          transparent: true,
          depthWrite: false,
          opacity: 0,
          polygonOffset: true,
          polygonOffsetFactor: -4,
        }),
      );
      m.position.y = 0.003;
      m.visible = false;
      this.marks.push(m);
      this.group.add(m);
    }

    const dustGeometry = new BufferGeometry();
    dustGeometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(DUST * 3), 3).setUsage(DynamicDrawUsage),
    );
    this.dust = new Points(
      dustGeometry,
      new PointsMaterial({
        map: puff,
        size: 0.16,
        transparent: true,
        depthWrite: false,
        opacity: 0.8,
        sizeAttenuation: true,
      }),
    );
    for (let i = 0; i < DUST; i++) {
      this.dustVel.push(new Vector3());
      this.dustAge[i] = 99;
    }
    this.dust.frustumCulled = false;
    this.group.add(this.dust);

    const trailGeometry = new BufferGeometry();
    trailGeometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(TRAIL * 3), 3).setUsage(DynamicDrawUsage),
    );
    trailGeometry.setAttribute(
      "color",
      new BufferAttribute(new Float32Array(TRAIL * 3), 3).setUsage(DynamicDrawUsage),
    );
    this.trail = new Line(
      trailGeometry,
      new LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.trail.frustumCulled = false;
    this.group.add(this.trail);

    this.path = new Line(
      new BufferGeometry(),
      new LineBasicMaterial({
        color: 0xf2c14e,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    this.path.frustumCulled = false;
    this.path.visible = false;
    this.group.add(this.path);
  }

  /** Moves the ball and turns it by its spin over `dt`. */
  update(position: Vector3, spin: Vector3 | null, dt: number, trail: boolean): void {
    this.mesh.position.copy(position);
    if (spin && dt > 0) {
      const angle = spin.length() * dt;
      if (angle > 0) {
        const q = new Quaternion().setFromAxisAngle(spin.clone().normalize(), angle);
        this.mesh.quaternion.premultiply(q);
      }
    }
    this.pushTrail(trail ? position : null);
    this.updateDust(dt);
  }

  private pushTrail(position: Vector3 | null): void {
    if (position) this.trailPoints.unshift(position.clone());
    else this.trailPoints.shift();
    if (this.trailPoints.length > TRAIL) this.trailPoints.length = TRAIL;
    const pos = this.trail.geometry.getAttribute("position") as BufferAttribute;
    const col = this.trail.geometry.getAttribute("color") as BufferAttribute;
    const n = this.trailPoints.length;
    for (let i = 0; i < TRAIL; i++) {
      const p = this.trailPoints[Math.min(i, n - 1)] ?? position ?? this.mesh.position;
      pos.setXYZ(i, p.x, p.y, p.z);
      const fade = i < n ? Math.pow(1 - i / TRAIL, 1.6) * 0.55 : 0;
      col.setXYZ(i, 0.95 * fade, 0.85 * fade, 0.45 * fade);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    this.trail.geometry.setDrawRange(0, Math.max(0, n));
  }

  clearTrail(): void {
    this.trailPoints.length = 0;
    this.trail.geometry.setDrawRange(0, 0);
  }

  /** Leaves a print on the clay, stretched along the ball's direction, and throws up dust. */
  bounce(at: Vector3, velocity: Vector3, withDust: boolean): void {
    const mark = this.marks[this.markIndex];
    this.markIndex = (this.markIndex + 1) % MARKS;
    if (mark) {
      mark.visible = true;
      mark.position.set(at.x, 0.003, at.z);
      mark.rotation.set(0, Math.atan2(velocity.x, velocity.z), 0);
      const speed = Math.hypot(velocity.x, velocity.z);
      mark.scale.set(1, 1, 0.7 + Math.min(1.1, speed / 25));
      (mark.material as MeshBasicMaterial).opacity = 0.85;
    }
    for (const other of this.marks) {
      const material = other.material as MeshBasicMaterial;
      if (other !== mark) material.opacity *= 0.9;
    }
    if (!withDust) return;
    const pos = this.dust.geometry.getAttribute("position") as BufferAttribute;
    const count = 10;
    for (let i = 0; i < count; i++) {
      const k = this.dustNext;
      this.dustNext = (this.dustNext + 1) % DUST;
      this.dustAge[k] = 0;
      pos.setXYZ(k, at.x, 0.03, at.z);
      const angle = Math.random() * Math.PI * 2;
      const spread = 0.25 + Math.random() * 0.5;
      this.dustVel[k]?.set(
        Math.cos(angle) * spread + velocity.x * 0.03,
        0.35 + Math.random() * 0.5,
        Math.sin(angle) * spread + velocity.z * 0.03,
      );
    }
    pos.needsUpdate = true;
  }

  private updateDust(dt: number): void {
    const pos = this.dust.geometry.getAttribute("position") as BufferAttribute;
    let alive = false;
    for (let i = 0; i < DUST; i++) {
      const age = this.dustAge[i] ?? 99;
      if (age > 1.2) {
        pos.setXYZ(i, 0, -10, 0);
        continue;
      }
      alive = true;
      this.dustAge[i] = age + dt;
      const v = this.dustVel[i];
      if (!v) continue;
      v.multiplyScalar(1 - 2.5 * dt);
      v.y -= 0.6 * dt;
      pos.setXYZ(
        i,
        pos.getX(i) + v.x * dt,
        Math.max(0.01, pos.getY(i) + v.y * dt),
        pos.getZ(i) + v.z * dt,
      );
    }
    pos.needsUpdate = true;
    (this.dust.material as PointsMaterial).opacity = alive ? 0.7 : 0;
  }

  /** Shows a full trajectory as a thin line (technique lab). */
  showPath(points: Vector3[] | null): void {
    if (!points || points.length < 2) {
      this.path.visible = false;
      return;
    }
    this.path.geometry.dispose();
    this.path.geometry = new BufferGeometry().setFromPoints(points);
    this.path.visible = true;
  }

  clearMarks(): void {
    for (const m of this.marks) {
      m.visible = false;
      (m.material as MeshBasicMaterial).opacity = 0;
    }
  }
}
