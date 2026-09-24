/**
 * The home page choreography (cinematic layout: ≥ 768 px and no reduced-motion preference).
 *
 * Every frame is a pure function of scroll position: ScrollTrigger reports how far each scene has
 * entered the viewport (`enter`) and how far its pinned part has been read (`hold`); `render()`
 * turns those numbers into layer opacities and transforms, effect overlays and the travelling
 * ball. Scrolling back simply renders earlier frames. Lenis smooths the scroll; SplitText splits
 * the few texts that light up word by word.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { createHalftone, type Halftone } from "./halftone";
import {
  IDENTITY,
  arcBetween,
  clamp,
  coverPoint,
  easeInOut,
  easeOut,
  hopAlong,
  lerp,
  segment,
  transformPoint,
  transformToCss,
  zoomTowards,
  type BallState,
  type LayerTransform,
} from "./geometry";

export type SceneConfig = {
  key: string;
  transition: string;
  tone: "light" | "dark";
  ball: { x: number; y: number; size: number };
};

type Layer = { el: HTMLElement; aspect: number };
type Runtime = {
  config: SceneConfig;
  section: HTMLElement;
  text: HTMLElement | null;
  sticky: boolean;
  primary: Layer | null;
  secondary: Layer | null;
  enter: ScrollTrigger;
  hold: ScrollTrigger;
  words: HTMLElement[];
  steps: HTMLElement[];
};

type LayerFrame = { opacity: number; transform: LayerTransform; z: number; framed: boolean };
type Effects = {
  parchment: number;
  parchmentOnTop: boolean;
  night: number;
  flash: number;
  court: number;
  courtDraw: number;
  rainbow: number;
  rainbowDraw: number;
  constellation: number;
  constellationDraw: number;
  halftone: number;
  halftoneProgress: number;
  brushFor: string | null;
  brushProgress: number;
  clouds: { x: number; y: number; scale: number; opacity: number }[] | null;
};
type BallFrame = BallState & { glow: number; cover: number; star: number };

const SECONDARY_SWITCH: Record<string, [number, number]> = {
  metoda: [0.45, 0.62],
  terenul: [0.6, 0.78],
  intrebari: [0.22, 0.42],
};

gsap.registerPlugin(ScrollTrigger, SplitText);

export function startCinematic(root: HTMLElement, configs: SceneConfig[]): () => void {
  const html = document.documentElement;
  const stage = root.querySelector<HTMLElement>(".stage");
  const ballEl = root.querySelector<HTMLElement>(".travel-ball");
  if (!stage || !ballEl) return () => undefined;
  const ballBody = ballEl.querySelector<HTMLElement>(".travel-ball-body");
  const ballGlow = ballEl.querySelector<HTMLElement>(".travel-ball-glow");
  const ballCover = ballEl.querySelector<HTMLElement>(".travel-ball-cover");
  const parchment = stage.querySelector<HTMLElement>(".stage-parchment");
  const night = stage.querySelector<HTMLElement>(".stage-night");
  const flash = stage.querySelector<HTMLElement>(".stage-flash");
  const court = stage.querySelector<SVGSVGElement>(".stage-court");
  const courtLines = court ? Array.from(court.querySelectorAll<SVGPathElement>(".court-line")) : [];
  const rainbow = stage.querySelector<SVGSVGElement>(".stage-rainbow");
  const rainbowBands = rainbow
    ? Array.from(rainbow.querySelectorAll<SVGPathElement>(".rainbow-band"))
    : [];
  const constellation = stage.querySelector<SVGSVGElement>(".stage-constellation");
  const constellationLine =
    constellation?.querySelector<SVGPathElement>(".constellation-line") ?? null;
  const constellationStars = constellation
    ? Array.from(constellation.querySelectorAll<SVGCircleElement>(".constellation-star"))
    : [];
  const clouds = Array.from(stage.querySelectorAll<HTMLElement>(".stage-cloud"));
  const canvas = stage.querySelector<HTMLCanvasElement>(".stage-halftone");
  const halftoneFallback = stage.querySelector<HTMLElement>(".stage-halftone-fallback");
  const brushes = new Map<string, SVGSVGElement>();
  stage.querySelectorAll<SVGSVGElement>(".stage-brush").forEach((svg) => {
    const key = svg.dataset.brushFor;
    if (key) brushes.set(key, svg);
  });
  const indexLinks = new Map<string, HTMLAnchorElement>();
  root.querySelectorAll<HTMLAnchorElement>("[data-index-link]").forEach((a) => {
    if (a.dataset.indexLink) indexLinks.set(a.dataset.indexLink, a);
  });
  const indexProgress = root.querySelector<HTMLElement>(".scene-index-progress");

  let halftone: Halftone | null = canvas ? createHalftone(canvas) : null;
  if (!halftone && halftoneFallback) halftoneFallback.dataset.active = "true";

  const layerOf = (key: string, role: "primary" | "secondary"): Layer | null => {
    const el = stage.querySelector<HTMLElement>(
      `.stage-layer[data-layer="${key}"][data-role="${role}"]`,
    );
    return el ? { el, aspect: Number(el.dataset.aspect) || 16 / 9 } : null;
  };
  const allLayers = Array.from(stage.querySelectorAll<HTMLElement>(".stage-layer"));

  // ── Lenis smooth scroll, driven by GSAP's ticker ─────────────────────────────
  const lenis = new Lenis({ lerp: 0.11, smoothWheel: true, anchors: true });
  lenis.on("scroll", ScrollTrigger.update);
  const tick = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  const onMenu = (event: Event) => {
    const open = (event as CustomEvent<{ open: boolean }>).detail?.open;
    if (open) lenis.stop();
    else lenis.start();
  };
  window.addEventListener("site:menu", onMenu);

  // ── Scenes ───────────────────────────────────────────────────────────────────
  let dirty = true;
  const markDirty = () => {
    dirty = true;
  };
  const splits: SplitText[] = [];
  const runtimes: Runtime[] = configs.flatMap((config) => {
    const section = root.querySelector<HTMLElement>(`section[data-scene="${config.key}"]`);
    if (!section) return [];
    const words: HTMLElement[] = [];
    section.querySelectorAll<HTMLElement>("[data-split]").forEach((el) => {
      const split = SplitText.create(el, { type: "words", aria: "auto" });
      splits.push(split);
      words.push(...(split.words as HTMLElement[]));
    });
    return [
      {
        config,
        section,
        text: section.querySelector<HTMLElement>(".scene-text"),
        sticky: section.classList.contains("scene--sticky"),
        primary: layerOf(config.key, "primary"),
        secondary: layerOf(config.key, "secondary"),
        enter: ScrollTrigger.create({
          trigger: section,
          start: "top bottom",
          end: "top top",
          onUpdate: markDirty,
        }),
        hold: ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          onUpdate: markDirty,
        }),
        words,
        steps: Array.from(section.querySelectorAll<HTMLElement>(".method-step")),
      },
    ];
  });

  // The programmes band: its section is as tall as the horizontal distance to travel.
  const programs = runtimes.find((r) => r.config.key === "programe");
  const track = programs?.section.querySelector<HTMLElement>(".programs-track") ?? null;
  const trackViewport = programs?.section.querySelector<HTMLElement>(".programs-viewport") ?? null;
  let trackDistance = 0;
  const measureTrack = () => {
    if (!programs || !track || !trackViewport) return;
    track.style.transform = "";
    trackDistance = Math.max(0, track.scrollWidth - trackViewport.clientWidth);
    programs.section.style.height = `${Math.round(trackDistance + window.innerHeight * 1.4)}px`;
  };
  ScrollTrigger.addEventListener("refreshInit", measureTrack);
  measureTrack();

  const programAnchors = programs
    ? Array.from(programs.section.querySelectorAll<HTMLElement>("[data-ball-anchor]"))
    : [];

  // ── Frame computation ────────────────────────────────────────────────────────
  const W = () => window.innerWidth;
  const H = () => window.innerHeight;

  const anchor = (
    layer: Layer | null,
    ball: SceneConfig["ball"],
    transform: LayerTransform = IDENTITY,
    overrides?: Partial<SceneConfig["ball"]>,
  ): BallState => {
    const b = { ...ball, ...overrides };
    const aspect = layer?.aspect ?? 16 / 9;
    const point = transformPoint(coverPoint(b.x, b.y, b.size, W(), H(), aspect), transform);
    return { x: point.x, y: point.y, size: point.size, opacity: 0 };
  };

  type SceneFrame = {
    layers: Map<HTMLElement, LayerFrame>;
    effects: Partial<Effects>;
    ball: BallFrame;
    textOpacity?: number;
  };

  const holdFrame = (r: Runtime, h: number): SceneFrame => {
    const layers = new Map<HTMLElement, LayerFrame>();
    const effects: Partial<Effects> = {};
    const key = r.config.key;
    const breathe: LayerTransform = {
      scale: 1 + 0.035 * h,
      originX: W() / 2,
      originY: H() / 2,
      translateX: 0,
      translateY: 0,
    };
    let primaryTransform = breathe;
    let primaryOpacity = 1;
    let framed = false;
    let ball: BallFrame = {
      ...anchor(r.primary, r.config.ball, breathe),
      glow: 0,
      cover: 0,
      star: 0,
    };

    const sw = SECONDARY_SWITCH[key] ?? [0.45, 0.6];
    const secondaryOpacity = r.secondary ? segment(h, sw[0], sw[1]) : 0;

    switch (key) {
      case "filozofia": {
        const composed = segment(h, 0, 0.82);
        const handoff = segment(h, 0.84, 0.98);
        effects.halftone = 1 - handoff;
        effects.halftoneProgress = composed;
        ball = { ...ball, opacity: handoff };
        effects.clouds = cloudsFor("sky", h);
        break;
      }
      case "metoda": {
        const toPlan = easeInOut(segment(h, sw[0], 0.78));
        if (toPlan > 0) {
          const from = anchor(r.primary, r.config.ball, breathe);
          const to = anchor(r.secondary, r.config.ball, IDENTITY, { x: 0.69, y: 0.49, size: 0.02 });
          const mid = arcBetween({ ...from, opacity: 1 }, { ...to, opacity: 1 }, toPlan, 0.08);
          ball = { ...mid, opacity: 1, glow: 0.3, cover: 0, star: 0 };
        }
        break;
      }
      case "programe": {
        primaryTransform = IDENTITY;
        if (track)
          track.style.transform = `translate3d(${(-h * trackDistance).toFixed(1)}px, 0, 0)`;
        const anchors: BallState[] = programAnchors.map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            size: Math.max(18, W() * 0.018),
            opacity: 1,
          };
        });
        const visible = anchors.filter((a) => a.x > W() * 0.05 && a.x < W() * 0.98);
        const list = visible.length > 0 ? anchors : anchors;
        ball = { ...hopAlong(list, h, 0.35), opacity: 1, glow: 0.25, cover: 0, star: 0 };
        break;
      }
      case "terenul": {
        primaryTransform = IDENTITY;
        effects.parchment = 1;
        effects.court = 1 - segment(h, 0.5, 0.62);
        effects.courtDraw = segment(h, 0.02, 0.4);
        primaryOpacity = segment(h, 0.32, 0.48);
        const descent = easeOut(segment(h, 0.08, 0.5));
        const top = anchor(r.primary, r.config.ball, IDENTITY, { y: 0.06 });
        const centre = anchor(r.primary, r.config.ball, IDENTITY);
        ball = {
          x: lerp(top.x, centre.x, descent),
          y: lerp(top.y, centre.y, descent),
          size: centre.size,
          opacity: 1 - segment(h, 0.7, 0.8),
          glow: 0.35,
          cover: 0,
          star: 0,
        };
        break;
      }
      case "prima-lectie": {
        const e = easeInOut(segment(h, 0, 0.55));
        effects.parchment = 1;
        primaryTransform = {
          scale: 1 - 0.38 * e,
          originX: W() / 2,
          originY: H() / 2,
          translateX: W() * 0.19 * e,
          translateY: 0,
        };
        framed = e > 0.02;
        ball = {
          ...anchor(r.primary, r.config.ball, primaryTransform),
          glow: 0.35 + 0.5 * segment(h, 0.35, 0.7),
          cover: 0,
          star: 0,
        };
        break;
      }
      case "locurile":
        effects.clouds = cloudsFor("garden", h);
        break;
      case "constelatia": {
        primaryTransform = IDENTITY;
        effects.constellation = 1;
        effects.constellationDraw = segment(h, 0, 0.45);
        ball = { ...anchor(r.primary, r.config.ball), opacity: 1, glow: 0.6, cover: 0, star: 1 };
        break;
      }
      default:
        break;
    }

    if (r.primary)
      layers.set(r.primary.el, {
        opacity: primaryOpacity,
        transform: primaryTransform,
        z: 1,
        framed,
      });
    if (r.secondary)
      layers.set(r.secondary.el, {
        opacity: secondaryOpacity,
        transform: IDENTITY,
        z: 2,
        framed: false,
      });
    if (
      key !== "metoda" &&
      key !== "programe" &&
      key !== "terenul" &&
      key !== "constelatia" &&
      key !== "filozofia" &&
      r.secondary
    ) {
      // Secondary paintings carry their own ball; keep the overlay hidden.
      ball = { ...ball, opacity: 0 };
    }

    // Method steps appear one after another.
    r.steps.forEach((step, i) => {
      const s = segment(h, 0.04 + i * 0.11, 0.14 + i * 0.11);
      step.style.opacity = String(0.12 + 0.88 * s);
      step.style.transform = `translate3d(0, ${((1 - s) * 14).toFixed(1)}px, 0)`;
    });
    // Words light up in reading order.
    const n = r.words.length;
    r.words.forEach((word, i) => {
      const start = (i / Math.max(1, n)) * 0.62;
      word.style.opacity = String(0.22 + 0.78 * segment(h, start, start + 0.12));
    });

    return { layers, effects, ball };
  };

  function cloudsFor(mode: "sky" | "garden" | "sweep", t: number): Effects["clouds"] {
    const w = W();
    const hgt = H();
    if (mode === "sweep") {
      return clouds.map((_, i) => {
        const e = easeInOut(segment(t, i * 0.05, 0.62 + i * 0.05));
        return {
          x: w * (1.15 - 2.5 * e) - w * 0.2 * (i % 2),
          y: hgt * (0.05 + ((i * 0.19) % 0.8)),
          scale: 1.8 + (i % 3) * 0.4,
          opacity: 1,
        };
      });
    }
    // Two foreground clouds drift a little faster than the painting: a light parallax.
    const base =
      mode === "sky"
        ? [
            [0.58, 0.7],
            [0.08, 0.02],
          ]
        : [
            [0.02, 0.36],
            [0.34, 0.8],
          ];
    return clouds.map((_, i) => {
      const slot = base[i];
      if (!slot) return { x: 0, y: 0, scale: 1, opacity: 0 };
      const [bx, by] = slot;
      return {
        x: w * ((bx ?? 0) - 0.08 * t * (1 + i * 0.4)),
        y: hgt * ((by ?? 0) - 0.04 * t),
        scale: 0.62 + i * 0.1,
        opacity: 0.92,
      };
    });
  }

  const applyTransition = (
    out: SceneFrame,
    inc: SceneFrame,
    type: string,
    p: number,
    from: Runtime,
    to: Runtime,
  ): SceneFrame => {
    const layers = new Map<HTMLElement, LayerFrame>();
    const effects: Partial<Effects> = { ...out.effects };
    const outLayers = out.layers;
    const incLayers = inc.layers;
    const setOut = (fn: (frame: LayerFrame) => LayerFrame) =>
      outLayers.forEach((f, el) => layers.set(el, fn({ ...f })));
    const setInc = (opacity: number, scale = 1) =>
      incLayers.forEach((f, el) =>
        layers.set(el, {
          ...f,
          opacity: f.opacity * opacity,
          z: f.z + 10,
          transform:
            scale === 1
              ? f.transform
              : {
                  ...f.transform,
                  scale: f.transform.scale * scale,
                  originX: W() / 2,
                  originY: H() / 2,
                },
        }),
      );
    const outBall = out.ball;
    const incBall = inc.ball;
    const travel = (): BallFrame => {
      const a = { ...outBall, opacity: 1 };
      const b = { ...incBall, opacity: 1 };
      const moved = arcBetween(a, b, p);
      const visibility = Math.max(
        lerp(outBall.opacity, incBall.opacity, p),
        Math.sin(Math.PI * clamp(p)),
      );
      return {
        ...moved,
        opacity: visibility,
        glow: lerp(outBall.glow, incBall.glow, p) + 0.25 * Math.sin(Math.PI * p),
        cover: 0,
        star: lerp(outBall.star, incBall.star, easeInOut(p)),
      };
    };
    let ball = travel();

    switch (type) {
      case "ZOOM_LENT": {
        const z = 1 + 0.4 * Math.pow(p, 1.6);
        const zoom = zoomTowards({ x: outBall.x, y: outBall.y }, z);
        setOut((f) => ({ ...f, transform: zoom }));
        setInc(segment(p, 0.4, 0.95), lerp(1.06, 1, p));
        const start = transformPoint(outBall, zoom);
        ball = {
          ...ball,
          ...arcBetween(
            { ...outBall, ...start, opacity: 1 },
            { ...incBall, opacity: 1 },
            segment(p, 0.25, 1),
          ),
        };
        break;
      }
      case "ZOOM_MINGE": {
        const zp = Math.pow(segment(p, 0, 0.62), 2);
        const zoom = zoomTowards({ x: outBall.x, y: outBall.y }, 1 + 5 * zp);
        setOut((f) => ({ ...f, transform: zoom }));
        setInc(segment(p, 0.62, 0.66));
        const grow = Math.pow(segment(p, 0.15, 0.62), 2);
        const diag = Math.hypot(W(), H()) * 2.4;
        ball = {
          x: lerp(outBall.x, W() / 2, grow),
          y: lerp(outBall.y, H() / 2, grow),
          size: lerp(outBall.size * (1 + 5 * zp), diag, grow),
          opacity: 1 - segment(p, 0.72, 0.97),
          glow: 0.4 * (1 - grow),
          cover: segment(p, 0.42, 0.62),
          star: 0,
        };
        break;
      }
      case "NORI": {
        setOut((f) => f);
        setInc(segment(p, 0.34, 0.58));
        effects.clouds = cloudsFor("sweep", p);
        effects.halftone = 0;
        break;
      }
      case "PERGAMENT": {
        const z = 1 + 0.25 * easeInOut(segment(p, 0, 0.6));
        setOut((f) => ({
          ...f,
          transform: {
            ...f.transform,
            scale: f.transform.scale * z,
            originX: W() / 2,
            originY: H() / 2,
          },
        }));
        effects.parchment = segment(p, 0.15, 0.55);
        effects.parchmentOnTop = true;
        setInc(segment(p, 0.6, 0.95));
        break;
      }
      case "MASCA_PENSULA": {
        setOut((f) => f);
        const done = p > 0.97;
        setInc(done ? 1 : 0);
        effects.brushFor = done ? null : to.config.key;
        effects.brushProgress = p;
        break;
      }
      case "CURCUBEU": {
        setOut((f) => f);
        setInc(segment(p, 0.35, 0.85));
        effects.rainbow = 1 - segment(p, 0.72, 1);
        effects.rainbowDraw = segment(p, 0, 0.6);
        effects.flash = Math.sin(Math.PI * p) * 0.3;
        break;
      }
      case "NOAPTE": {
        setOut((f) => f);
        effects.night = Math.min(segment(p, 0, 0.45), 1 - segment(p, 0.62, 1));
        setInc(segment(p, 0.4, 0.8));
        effects.constellation = segment(p, 0.6, 1);
        effects.constellationDraw = 0;
        break;
      }
      default: {
        setOut((f) => f);
        setInc(easeInOut(p), lerp(1.04, 1, p));
      }
    }

    // Effects that belong to the incoming scene appear with it.
    if (inc.effects.parchment && !effects.parchmentOnTop)
      effects.parchment = Math.max(effects.parchment ?? 0, inc.effects.parchment * p);
    if (inc.effects.clouds && !effects.clouds)
      effects.clouds = inc.effects.clouds.map((c) => ({ ...c, opacity: c.opacity * p }));
    if (from.config.key === "filozofia") effects.halftone = 0;
    return { layers, effects, ball };
  };

  // ── Writing a frame to the DOM ───────────────────────────────────────────────
  const setDash = (paths: SVGPathElement[], progress: number, stagger = 0) => {
    paths.forEach((path, i) => {
      const local =
        stagger > 0
          ? segment(
              progress,
              i * stagger,
              Math.min(1, i * stagger + (1 - stagger * (paths.length - 1))),
            )
          : progress;
      path.style.strokeDashoffset = String(1 - local);
    });
  };

  let lastTone = "";
  let lastActive = "";
  const render = () => {
    dirty = false;
    if (runtimes.length === 0) return;
    let current = 0;
    runtimes.forEach((r, i) => {
      if (r.enter.progress >= 1) current = i;
    });
    const cur = runtimes[current] as Runtime;
    const next = runtimes[current + 1];
    const p = next ? next.enter.progress : 0;

    let frame = holdFrame(cur, cur.hold.progress);
    if (next && p > 0)
      frame = applyTransition(frame, holdFrame(next, 0), cur.config.transition, p, cur, next);

    // Layers
    for (const el of allLayers) {
      const f = frame.layers.get(el);
      const opacity = f ? clamp(f.opacity) : 0;
      el.style.opacity = opacity.toFixed(3);
      el.style.visibility = opacity > 0.001 ? "visible" : "hidden";
      if (f) {
        const css = transformToCss(f.transform);
        el.style.transform = css.transform;
        el.style.transformOrigin = css.transformOrigin;
        el.style.zIndex = String(f.z);
        el.toggleAttribute("data-framed", f.framed);
      }
    }
    // Effects
    const e = frame.effects;
    if (parchment) {
      parchment.style.opacity = String(clamp(e.parchment ?? 0));
      parchment.style.zIndex = e.parchmentOnTop ? "30" : "0";
    }
    if (night) night.style.opacity = String(clamp(e.night ?? 0));
    if (flash) flash.style.opacity = String(clamp(e.flash ?? 0));
    if (court) {
      court.style.opacity = String(clamp(e.court ?? 0));
      setDash(courtLines, e.courtDraw ?? 0, 0.06);
    }
    if (rainbow) {
      rainbow.style.opacity = String(clamp(e.rainbow ?? 0));
      setDash(rainbowBands, e.rainbowDraw ?? 0);
    }
    if (constellation) {
      constellation.style.opacity = String(clamp(e.constellation ?? 0));
      if (constellationLine)
        constellationLine.style.strokeDashoffset = String(1 - (e.constellationDraw ?? 0));
      constellationStars.forEach((star, i) => {
        star.style.opacity = String(
          segment(
            e.constellationDraw ?? 0,
            i / constellationStars.length - 0.1,
            i / constellationStars.length + 0.1,
          ) *
            0.9 +
            0.1,
        );
      });
    }
    brushes.forEach((svg, key) => {
      const active = e.brushFor === key;
      svg.style.opacity = active ? "1" : "0";
      svg.style.visibility = active ? "visible" : "hidden";
      if (active) {
        const image = svg.querySelector("image");
        if (image && !image.getAttribute("href") && image.dataset.href)
          image.setAttribute("href", image.dataset.href);
        const strokes = Array.from(svg.querySelectorAll<SVGPathElement>(".brush-stroke"));
        strokes.forEach((stroke, i) => {
          stroke.style.strokeDashoffset = String(
            1 - segment(e.brushProgress ?? 0, i * 0.18, i * 0.18 + 0.55),
          );
        });
      }
    });
    clouds.forEach((cloud, i) => {
      const c = e.clouds?.[i];
      if (!c || c.opacity <= 0) {
        cloud.style.opacity = "0";
        return;
      }
      cloud.style.opacity = String(clamp(c.opacity));
      cloud.style.transform = `translate3d(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px, 0) scale(${c.scale.toFixed(3)})`;
    });
    // Halftone
    const halftoneOpacity = clamp(e.halftone ?? 0);
    const philosophy = runtimes.find((r) => r.config.key === "filozofia");
    if (philosophy) {
      const target = anchor(philosophy.primary, philosophy.config.ball);
      if (halftone) {
        if (halftoneOpacity > 0)
          halftone.render({
            x: target.x,
            y: target.y,
            radius: target.size / 2,
            progress: e.halftoneProgress ?? 0,
            opacity: halftoneOpacity,
          });
        else halftone.clear();
      } else if (halftoneFallback) {
        halftoneFallback.style.opacity = String(halftoneOpacity);
        halftoneFallback.style.setProperty("--r", String(0.8 + 6 * (e.halftoneProgress ?? 0)));
        halftoneFallback.style.left = `${target.x - target.size / 2}px`;
        halftoneFallback.style.top = `${target.y - target.size / 2}px`;
        halftoneFallback.style.width = `${target.size}px`;
        halftoneFallback.style.height = `${target.size}px`;
      }
    }
    // Ball
    const b = frame.ball;
    const size = Math.max(1, b.size);
    ballEl.style.transform = `translate3d(${(b.x - size / 2).toFixed(1)}px, ${(b.y - size / 2).toFixed(1)}px, 0)`;
    ballEl.style.width = `${size.toFixed(1)}px`;
    ballEl.style.height = `${size.toFixed(1)}px`;
    if (ballBody) ballBody.style.opacity = clamp(b.opacity).toFixed(3);
    if (ballGlow)
      ballGlow.style.opacity = clamp(Math.max(b.glow * (b.opacity > 0.05 ? 1 : 0.6), 0)).toFixed(3);
    if (ballCover) ballCover.style.opacity = clamp(b.cover).toFixed(3);
    ballEl.style.setProperty("--star", clamp(b.star).toFixed(3));

    // Texts fade in as their scene settles and out as the next one arrives.
    runtimes.forEach((r, i) => {
      if (!r.text || !r.sticky) return;
      const nextRuntime = runtimes[i + 1];
      const inOpacity = i === 0 ? 1 : segment(r.enter.progress, 0.55, 0.95);
      const outOpacity = nextRuntime ? 1 - segment(nextRuntime.enter.progress, 0, 0.45) : 1;
      r.text.style.opacity = Math.min(inOpacity, outOpacity).toFixed(3);
    });

    // Tone of the interface, index and progress line.
    const active = p >= 0.5 && next ? next : cur;
    const tone = active.config.tone;
    if (tone !== lastTone) {
      html.dataset.tone = tone;
      lastTone = tone;
    }
    if (active.config.key !== lastActive) {
      indexLinks.forEach((link, key) => {
        if (key === active.config.key) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
      lastActive = active.config.key;
    }
    if (indexProgress) {
      const rect = root.getBoundingClientRect();
      const total = Math.max(1, rect.height - H());
      indexProgress.style.transform = `scaleY(${clamp(-rect.top / total).toFixed(4)})`;
    }
  };

  const loop = () => {
    if (dirty) render();
  };
  gsap.ticker.add(loop);

  const onResize = () => {
    halftone?.resize();
    markDirty();
  };
  window.addEventListener("resize", onResize);
  ScrollTrigger.addEventListener("refresh", markDirty);
  root.dataset.cinematic = "on";
  ScrollTrigger.refresh();
  render();

  return () => {
    window.removeEventListener("resize", onResize);
    window.removeEventListener("site:menu", onMenu);
    ScrollTrigger.removeEventListener("refreshInit", measureTrack);
    ScrollTrigger.removeEventListener("refresh", markDirty);
    gsap.ticker.remove(loop);
    gsap.ticker.remove(tick);
    runtimes.forEach((r) => {
      r.enter.kill();
      r.hold.kill();
    });
    splits.forEach((split) => split.revert());
    lenis.destroy();
    halftone?.destroy();
    halftone = null;
    delete root.dataset.cinematic;
    html.dataset.tone = "dark";
    if (programs) programs.section.style.height = "";
    if (track) track.style.transform = "";
    root.querySelectorAll<HTMLElement>(".scene-text, .method-step").forEach((el) => {
      el.style.opacity = "";
      el.style.transform = "";
    });
  };
}
