import {
  NeutralToneMapping,
  PCFShadowMap,
  PerspectiveCamera,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { createStage, loadSky, type Detail } from "./stage";
import { loadHuman } from "./humanAsset";
import { Player, type Outfit } from "./player";
import { BallView } from "./ballView";
import { Rally } from "./rally";
import { TechniqueLab, phaseAt } from "./lab";
import { gripTexture, stringTexture } from "./textures";
import type { StrokeName } from "./strokes";
import { COURT } from "./court";

export type Mode = "rally" | "lab";
export type LabView = "lateral" | "frontal" | "spate" | "sus";
export type LabSnapshot = {
  stroke: StrokeName;
  time: number;
  duration: number;
  phase: number;
  playing: boolean;
};

export type HostOptions = {
  mode: Mode;
  /** Called once the first frame has been drawn in this host (the poster can fade out). */
  onReady?: () => void;
  onLab?: (snapshot: LabSnapshot) => void;
};

type Host = HostOptions & { el: HTMLElement; ratio: number; ready: boolean };

type Shot = { pos: Vector3; look: Vector3; fov: number };

type Parts = {
  renderer: WebGLRenderer;
  maxPixelRatio: number;
  stage: ReturnType<typeof createStage>;
  near: Player;
  far: Player;
  labPlayer: Player;
  rallyBall: BallView;
  labBall: BallView;
  rally: Rally;
  lab: TechniqueLab;
};

/**
 * Broadcast-style angles for the match, one per point. All of them keep the near player in the
 * right half of the frame, clear of the headline.
 */
const RALLY_SHOTS: Shot[] = [
  { pos: new Vector3(-8.4, 6, 18), look: new Vector3(2.2, 0.2, 2.5), fov: 46 },
  { pos: new Vector3(-7.2, 3.2, 17.6), look: new Vector3(3.2, 0.6, 5), fov: 46 },
  { pos: new Vector3(-8.8, 4.4, 16.4), look: new Vector3(3, 0.4, 4.5), fov: 44 },
];

const LAB_VIEWS: Record<LabView, { az: number; el: number }> = {
  lateral: { az: 90, el: 8 },
  frontal: { az: 160, el: 10 },
  spate: { az: 18, el: 14 },
  sus: { az: 30, el: 68 },
};

const NEAR_OUTFIT: Outfit = { shirt: 0xf3f0ea, shorts: 0x2b2f3b, shoe: 0xf5f3ef };
const FAR_OUTFIT: Outfit = { shirt: 0x24324a, shorts: 0xf0ede6, shoe: 0xf5f3ef };

/**
 * The single WebGL scene behind every 3D viewport on the page. Viewports register their
 * element; the canvas lives in whichever one is most visible, and nothing is drawn when none
 * is on screen or the tab is hidden. One context, one set of textures, however many viewports.
 */
export class CourtEngine {
  private readonly renderer: WebGLRenderer;
  private readonly camera = new PerspectiveCamera(42, 16 / 9, 0.1, 400);
  private readonly stage: ReturnType<typeof createStage>;
  private readonly rally: Rally;
  private readonly lab: TechniqueLab;
  private readonly rallyGroup: Player[];
  private readonly rallyBall: BallView;
  private readonly labBall: BallView;
  private readonly labPlayer: Player;
  private readonly hosts = new Map<HTMLElement, Host>();
  private active: Host | null = null;
  private readonly observer: IntersectionObserver;
  private readonly resizeObserver: ResizeObserver;
  private frame = 0;
  private lastTime = 0;
  private running = false;
  private disposed = false;
  private readonly reducedMotion: boolean;
  private readonly maxPixelRatio: number;
  private pixelRatio: number;
  private frameTimes: number[] = [];
  private shotIndex = 0;
  private lastPoint = -1;
  private readonly pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  private readonly look = new Vector3();
  private follow = 0;
  private labView: LabView = "lateral";
  private readonly orbit = { az: 90, el: 8, taz: 90, tel: 8 };
  private drag: { id: number; x: number; y: number } | null = null;
  private lastLabEmit = 0;
  private lastPhase = -1;
  private stillDrawn = false;
  private needsDraw = true;
  /** Low detail draws every other display frame (30 fps is plenty for the match). */
  private readonly lowDetail: boolean;
  private frameCount = 0;
  /** Set when even the lowest resolution is too slow: the scene then stops animating. */
  private throttled = false;

  private constructor(options: { detail: Detail; reducedMotion: boolean }, parts: Parts) {
    this.reducedMotion = options.reducedMotion;
    this.lowDetail = options.detail === "low";
    this.renderer = parts.renderer;
    this.maxPixelRatio = parts.maxPixelRatio;
    this.pixelRatio = parts.maxPixelRatio;
    this.stage = parts.stage;
    this.rallyGroup = [parts.near, parts.far];
    this.rallyBall = parts.rallyBall;
    this.labBall = parts.labBall;
    this.labPlayer = parts.labPlayer;
    this.rally = parts.rally;
    this.lab = parts.lab;
    if (this.reducedMotion) {
      this.lab.playing = false;
      this.lab.time = 0.86;
    }
    const canvas = this.renderer.domElement;
    canvas.addEventListener("webglcontextlost", this.onContextLost);
    this.observer = new IntersectionObserver(this.onIntersect, {
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
    });
    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
      this.needsDraw = true;
      this.kick();
    });
    document.addEventListener("visibilitychange", this.onVisibility);
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    window.addEventListener("pointermove", this.onWindowPointer, { passive: true });
  }

  /**
   * Builds the scene in small steps, yielding to the browser between them so scrolling and
   * input stay responsive while textures are painted and shaders compile.
   */
  static async create(options: { detail: Detail; reducedMotion: boolean }): Promise<CourtEngine> {
    const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
    // The player model and the photographed surroundings download while the scene is built.
    const humanPromise = loadHuman();
    const skyPromise = loadSky(options.detail).catch(() => null);
    const renderer = new WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
    });
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = NeutralToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap;
    const maxPixelRatio = Math.min(
      window.devicePixelRatio || 1,
      options.detail === "high" ? 1.75 : 1.25,
    );
    renderer.setPixelRatio(maxPixelRatio);
    const canvas = renderer.domElement;
    canvas.className = "court3d-canvas";
    canvas.setAttribute("aria-hidden", "true");
    await pause();
    const stage = createStage(renderer, options.detail, await skyPromise);
    await pause();
    const racketTextures = { strings: stringTexture(), grip: gripTexture() };
    const human = await humanPromise;
    const near = new Player(NEAR_OUTFIT, racketTextures, human, options.detail);
    const far = new Player(FAR_OUTFIT, racketTextures, human, options.detail);
    const labPlayer = new Player(NEAR_OUTFIT, racketTextures, human, options.detail);
    const rallyBall = new BallView();
    const labBall = new BallView();
    stage.scene.add(near.root, far.root, rallyBall.group, labPlayer.root, labBall.group);
    await pause();
    const rally = new Rally(near, far, rallyBall);
    await pause();
    const lab = new TechniqueLab(labPlayer, labBall);
    lab.enter();
    await pause();
    // Compile every material once, in parallel where the driver allows it.
    const probe = new PerspectiveCamera(45, 16 / 9, 0.1, 400);
    probe.position.set(0, 6, 20);
    probe.lookAt(0, 0, 0);
    await renderer.compileAsync(stage.scene, probe);
    return new CourtEngine(options, {
      renderer,
      maxPixelRatio,
      stage,
      near,
      far,
      labPlayer,
      rallyBall,
      labBall,
      rally,
      lab,
    });
  }

  // ── Hosts ────────────────────────────────────────────────────────────────

  register(el: HTMLElement, options: HostOptions): () => void {
    const host: Host = { ...options, el, ratio: 0, ready: false };
    this.hosts.set(el, host);
    this.observer.observe(el);
    return () => {
      this.observer.unobserve(el);
      this.hosts.delete(el);
      if (this.active === host) {
        this.active = null;
        this.renderer.domElement.remove();
        this.pickActive();
      }
    };
  }

  private readonly onIntersect = (entries: IntersectionObserverEntry[]) => {
    for (const entry of entries) {
      const host = this.hosts.get(entry.target as HTMLElement);
      if (host) host.ratio = entry.isIntersecting ? entry.intersectionRatio || 0.01 : 0;
    }
    this.pickActive();
  };

  private pickActive(): void {
    let best: Host | null = null;
    for (const host of this.hosts.values()) {
      if (host.ratio > 0 && (!best || host.ratio > best.ratio)) best = host;
    }
    if (best !== this.active) {
      if (this.active) this.resizeObserver.unobserve(this.active.el);
      this.active = best;
      if (best) {
        best.el.appendChild(this.renderer.domElement);
        this.resizeObserver.observe(best.el);
        this.enterMode(best.mode);
        this.resize();
        this.needsDraw = true;
      }
    }
    if (this.active && document.visibilityState === "visible") this.kick();
    else this.stop();
  }

  private enterMode(mode: Mode): void {
    const rally = mode === "rally";
    for (const p of this.rallyGroup) p.root.visible = rally;
    this.rallyBall.group.visible = rally;
    this.labPlayer.root.visible = !rally;
    this.labBall.group.visible = !rally;
    const sun = this.stage.sun;
    const cam = sun.shadow.camera;
    if (rally) {
      sun.target.position.set(0, 0, 0);
      sun.position.set(-15, 17, 9);
      cam.left = cam.bottom = -21;
      cam.right = cam.top = 21;
    } else {
      const a = this.lab.anchor;
      sun.target.position.set(a.x, 0, a.z);
      sun.position.set(a.x - 7, 9, a.z + 4);
      cam.left = cam.bottom = -3.5;
      cam.right = cam.top = 3.5;
    }
    cam.updateProjectionMatrix();
    sun.target.updateMatrixWorld();
    if (rally && this.reducedMotion && !this.stillDrawn) {
      this.rally.advanceToNearContact();
      this.stillDrawn = true;
    }
  }

  // ── Loop ─────────────────────────────────────────────────────────────────

  private kick(): void {
    if (this.running || this.disposed || !this.active) return;
    this.running = true;
    this.lastTime = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  private stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  private readonly tick = (now: number) => {
    if (!this.running || !this.active) return;
    const host = this.active;
    const still = this.reducedMotion || this.throttled;
    if (this.lowDetail && !still && !this.needsDraw && this.frameCount++ % 2 === 1) {
      this.frame = requestAnimationFrame(this.tick);
      return;
    }
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    const animate = !still || host.mode === "lab";
    if (host.mode === "rally") {
      this.rally.update(still ? 0 : dt);
      this.updateRallyCamera(dt);
    } else {
      this.lab.update(dt);
      this.updateLabCamera(dt);
      this.emitLab(now);
    }
    this.renderer.render(this.stage.scene, this.camera);
    this.needsDraw = false;
    if (!host.ready) {
      host.ready = true;
      host.onReady?.();
    }
    this.adapt(dt);
    const settling =
      host.mode === "lab" &&
      (this.lab.playing ||
        Math.abs(this.orbit.az - this.orbit.taz) > 0.05 ||
        Math.abs(this.orbit.el - this.orbit.tel) > 0.05 ||
        this.drag !== null);
    if ((animate && (host.mode === "rally" || settling)) || this.needsDraw) {
      this.frame = requestAnimationFrame(this.tick);
    } else {
      this.running = false;
    }
  };

  /**
   * Lowers the resolution when frames take too long and raises it back when there is room. If
   * even the lowest resolution cannot keep up, the scene stops animating and keeps its last
   * frame: a slow device never pays for the decoration with a sluggish page.
   */
  private adapt(dt: number): void {
    if (dt <= 0 || this.throttled) return;
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 45) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes = [];
    const frame = this.lowDetail ? 1 / 30 : 1 / 60;
    let next = this.pixelRatio;
    if (avg > frame * 1.6) {
      if (this.pixelRatio <= 0.71) {
        this.throttled = true;
        this.lab.playing = false;
        return;
      }
      next = Math.max(0.7, this.pixelRatio - 0.2);
    } else if (avg < frame * 1.05 && this.pixelRatio < this.maxPixelRatio)
      next = Math.min(this.maxPixelRatio, this.pixelRatio + 0.1);
    if (Math.abs(next - this.pixelRatio) > 0.01) {
      this.pixelRatio = next;
      this.renderer.setPixelRatio(next);
      this.resize();
    }
  }

  private resize(): void {
    const el = this.active?.el;
    if (!el) return;
    const width = Math.max(1, el.clientWidth);
    const height = Math.max(1, el.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /** Vertical field of view that keeps at least `hfov` degrees across narrow screens. */
  private fovFor(vfov: number): number {
    const aspect = this.camera.aspect;
    const base = 16 / 9;
    if (aspect >= base * 0.95) return vfov;
    const h = 2 * Math.atan(Math.tan((vfov * Math.PI) / 360) * base * 0.95);
    return Math.min(75, (2 * Math.atan(Math.tan(h / 2) / aspect) * 180) / Math.PI);
  }

  private updateRallyCamera(dt: number): void {
    const point = this.rally.pointNumber;
    if (point !== this.lastPoint) {
      this.lastPoint = point;
      this.shotIndex = point % RALLY_SHOTS.length;
      this.look.copy(RALLY_SHOTS[this.shotIndex]?.look ?? this.look);
    }
    const shot = RALLY_SHOTS[this.shotIndex] ?? RALLY_SHOTS[0];
    if (!shot) return;
    const t = this.rally.clock;
    const k = 1 - Math.exp(-dt * 3);
    this.pointer.sx += (this.pointer.x - this.pointer.sx) * k;
    this.pointer.sy += (this.pointer.y - this.pointer.sy) * k;
    // The camera follows the near player sideways, so they stay in the right half of the frame.
    const near = this.rally.nearPosition;
    this.follow += (near.x - this.follow) * (1 - Math.exp(-dt * 1.2));
    this.camera.position.set(
      shot.pos.x + this.follow * 0.45 + Math.sin(t * 0.09) * 0.6 + this.pointer.sx * 0.6,
      shot.pos.y + Math.sin(t * 0.13) * 0.15 - this.pointer.sy * 0.3,
      Math.min(COURT.surfaceHalfLength - 0.2, shot.pos.z + Math.cos(t * 0.07) * 0.3),
    );
    const ball = this.rally.ballPosition;
    const target = shot.look.clone();
    target.x += this.follow * 0.3 + Math.max(-3, Math.min(3, ball.x)) * 0.12;
    target.z += Math.max(-COURT.halfLength, Math.min(COURT.halfLength, ball.z)) * 0.06;
    this.look.lerp(target, 1 - Math.exp(-dt * 1.5));
    this.camera.fov = this.fovFor(shot.fov);
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.look);
  }

  private updateLabCamera(dt: number): void {
    const o = this.orbit;
    const k = this.reducedMotion ? 1 : 1 - Math.exp(-dt * 5);
    o.az += (o.taz - o.az) * k;
    o.el += (o.tel - o.el) * k;
    const anchor = this.lab.anchor;
    const target = new Vector3(anchor.x + 0.15, 1.05, anchor.z - 0.2);
    const narrow = this.camera.aspect < 1;
    const distance = narrow ? 6.2 : 5.2;
    const az = (o.az * Math.PI) / 180;
    const el = (o.el * Math.PI) / 180;
    this.camera.position.set(
      target.x + Math.sin(az) * Math.cos(el) * distance,
      target.y + Math.sin(el) * distance,
      target.z + Math.cos(az) * Math.cos(el) * distance,
    );
    this.camera.fov = narrow ? 40 : 36;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(target);
  }

  private emitLab(now: number): void {
    const host = this.active;
    if (!host?.onLab) return;
    const phase = phaseAt(this.lab.stroke, Math.min(this.lab.time, this.lab.duration));
    if (phase !== this.lastPhase || now - this.lastLabEmit > 120) {
      this.lastPhase = phase;
      this.lastLabEmit = now;
      host.onLab(this.labSnapshot());
    }
  }

  labSnapshot(): LabSnapshot {
    return {
      stroke: this.lab.stroke,
      time: Math.min(this.lab.time, this.lab.duration),
      duration: this.lab.duration,
      phase: phaseAt(this.lab.stroke, Math.min(this.lab.time, this.lab.duration)),
      playing: this.lab.playing,
    };
  }

  // ── Technique lab controls ───────────────────────────────────────────────

  setStroke(stroke: StrokeName): void {
    this.lab.setStroke(stroke);
    this.lab.time = this.reducedMotion ? (stroke === "serve" ? 1.5 : 0.86) : 0;
    this.redraw();
  }

  setPlaying(playing: boolean): void {
    this.lab.playing = playing;
    this.redraw();
  }

  setTime(time: number): void {
    this.lab.playing = false;
    this.lab.time = Math.max(0, Math.min(this.lab.duration, time));
    this.redraw();
  }

  setView(view: LabView): void {
    this.labView = view;
    const v = LAB_VIEWS[view];
    this.orbit.taz = v.az;
    this.orbit.tel = v.el;
    this.redraw();
  }

  get view(): LabView {
    return this.labView;
  }

  private redraw(): void {
    this.needsDraw = true;
    this.kick();
    if (this.active?.onLab) this.active.onLab(this.labSnapshot());
  }

  // ── Input ────────────────────────────────────────────────────────────────

  private readonly onPointerDown = (event: PointerEvent) => {
    if (this.active?.mode !== "lab") return;
    this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    this.renderer.domElement.setPointerCapture(event.pointerId);
    this.kick();
  };

  private readonly onPointerMove = (event: PointerEvent) => {
    const d = this.drag;
    if (!d || d.id !== event.pointerId) return;
    this.orbit.taz -= (event.clientX - d.x) * 0.35;
    if (event.pointerType === "mouse") {
      this.orbit.tel = Math.max(4, Math.min(72, this.orbit.tel + (event.clientY - d.y) * 0.25));
    }
    d.x = event.clientX;
    d.y = event.clientY;
    this.kick();
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    if (this.drag?.id === event.pointerId) this.drag = null;
  };

  private readonly onWindowPointer = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
  };

  private readonly onVisibility = () => {
    if (document.visibilityState === "visible") this.kick();
    else this.stop();
  };

  private readonly onContextLost = (event: Event) => {
    event.preventDefault();
    this.stop();
    for (const host of this.hosts.values()) host.ready = false;
    this.renderer.domElement.remove();
    this.onLost?.();
  };

  onLost: (() => void) | null = null;

  dispose(): void {
    this.disposed = true;
    this.stop();
    this.observer.disconnect();
    this.resizeObserver.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("pointermove", this.onWindowPointer);
    this.renderer.dispose();
  }
}

let engine: Promise<CourtEngine> | null = null;

/** The shared engine, created on first use. */
export function getEngine(options: {
  detail: Detail;
  reducedMotion: boolean;
}): Promise<CourtEngine> {
  engine ??= CourtEngine.create(options);
  return engine;
}
