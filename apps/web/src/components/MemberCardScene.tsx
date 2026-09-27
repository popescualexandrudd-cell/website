"use client";

import { useEffect, useRef, useState } from "react";
import * as tokens from "@jungle/design-tokens/tokens";
import { CARD_TIERS, type CardTier } from "@/lib/site";
import { afterLoadIdle, createLoop, disposeScene, hasRealGpu, sceneFlags, usesSoftwareRendering } from "@/lib/webgl";

/**
 * The member card as a physical object: ID-1 format (85.6 × 54 mm), rounded edges, a metal core
 * under a clear lacquer (clearcoat) that reflects the room. Its finish follows the league status
 * (Silver → Diamond). Scrolling through the league section turns the card and walks through the
 * tiers (GSAP ScrollTrigger); choosing a tier spins the card to reveal the new finish.
 */

type Finish = { stops: string[]; ink: string; edge: string; metalness: number; roughness: number; env?: number };

const FINISH: Record<CardTier, Finish> = {
  silver: { stops: ["#EEF1F4", tokens.ColorMetalSilver, "#D3D9E0"], ink: tokens.ColorNight900, edge: tokens.ColorMetalSilver, metalness: 0.9, roughness: 0.3 },
  gold: { stops: ["#F1E2BE", tokens.ColorMetalGold, "#A8864B"], ink: tokens.ColorNight900, edge: tokens.ColorMetalGold, metalness: 0.95, roughness: 0.26 },
  platinum: { stops: ["#FAFBFC", tokens.ColorMetalPlatinum, "#BCC6D0"], ink: tokens.ColorNight900, edge: tokens.ColorMetalPlatinum, metalness: 0.85, roughness: 0.2 },
  diamond: { stops: [tokens.ColorNight700, tokens.ColorNight900, tokens.ColorNight950], ink: tokens.ColorBone50, edge: tokens.ColorBrass400, metalness: 0.55, roughness: 0.24, env: 0.32 },
};

export type CardLabels = { brand: string; member: string; tiers: Record<CardTier, string> };

function drawFace(labels: CardLabels, tier: CardTier, back: boolean): HTMLCanvasElement {
  const f = FINISH[tier];
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 646;
  const g = canvas.getContext("2d")!;
  const gradient = g.createLinearGradient(0, 0, 1024, 646);
  f.stops.forEach((stop, i) => gradient.addColorStop(i / (f.stops.length - 1), stop));
  g.fillStyle = gradient;
  g.fillRect(0, 0, 1024, 646);
  // Brushed-metal grain: fine horizontal strokes.
  for (let y = 0; y < 646; y += 2) {
    g.fillStyle = `rgba(255,255,255,${(Math.sin(y * 12.9898) * 0.5 + 0.5) * 0.06})`;
    g.fillRect(0, y, 1024, 1);
  }
  // Guilloché rings, engraved in the lower right corner.
  g.strokeStyle = tier === "diamond" ? "rgba(220,192,138,0.22)" : "rgba(10,19,32,0.10)";
  g.lineWidth = 1.2;
  for (let r = 60; r < 520; r += 14) {
    g.beginPath();
    g.arc(980, 640, r, Math.PI, Math.PI * 1.5);
    g.stroke();
  }
  const font = (weight: number, size: number) => `${weight} ${size}px "Instrument Sans", system-ui, sans-serif`;
  const serif = (size: number) => `400 ${size}px Fraunces, Georgia, serif`;
  g.fillStyle = f.ink;
  g.textBaseline = "alphabetic";
  if ("letterSpacing" in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "10px";
  g.font = font(600, 32);
  g.fillText(labels.brand.toUpperCase(), 72, 110);
  if (back) {
    g.font = font(500, 26);
    g.globalAlpha = 0.75;
    g.fillText(labels.member, 72, 560);
    return canvas;
  }
  // The emerald leaf seam of the provisional mark.
  g.strokeStyle = tier === "diamond" ? tokens.ColorBrass300 : tokens.ColorForest700;
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(72, 150);
  g.lineTo(210, 150);
  g.stroke();
  g.fillStyle = f.ink;
  g.font = font(500, 26);
  g.globalAlpha = 0.8;
  g.fillText(labels.member, 72, 488);
  g.globalAlpha = 1;
  if ("letterSpacing" in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
  g.font = serif(84);
  g.fillText(labels.tiers[tier], 68, 574);
  return canvas;
}

export default function MemberCardScene({
  tier,
  labels,
  onScrollTier,
}: {
  tier: CardTier;
  labels: CardLabels;
  onScrollTier: (tier: CardTier) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const setTierRef = useRef<(tier: CardTier) => void>(() => {});
  const initial = useRef({ tier, labels, onScrollTier });
  useEffect(() => {
    initial.current.onScrollTier = onScrollTier;
  }, [onScrollTier]);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let disposed = false;
    let teardown = () => {};

    const cancelStart = afterLoadIdle(async () => {
      if (!sceneFlags().forced && !hasRealGpu()) return; // the static render stays
      const [THREE, { RoomEnvironment }, { gsap }, { ScrollTrigger }] = await Promise.all([
        import("three"),
        import("three/examples/jsm/environments/RoomEnvironment.js"),
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      await Promise.all([
        document.fonts?.load('400 84px Fraunces'),
        document.fonts?.load('600 32px "Instrument Sans"'),
      ]).catch(() => undefined);
      if (disposed) return;
      const flags = sceneFlags();
      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: flags.capture });
      } catch {
        return;
      }
      if (!flags.forced && usesSoftwareRendering(renderer)) {
        renderer.dispose();
        return;
      }
      renderer.setPixelRatio(flags.capture ? 2 : Math.min(window.devicePixelRatio, flags.small ? 1.5 : 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.NeutralToneMapping;
      renderer.domElement.setAttribute("aria-hidden", "true");
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.02);
      scene.environment = envTarget.texture;
      const key = new THREE.DirectionalLight(0xffffff, 1.6);
      key.position.set(-4, 6, 8);
      scene.add(key, new THREE.AmbientLight(0xffffff, 0.35));

      const faceMaterial = (canvas: HTMLCanvasElement, f: Finish) => {
        const map = new THREE.CanvasTexture(canvas);
        map.colorSpace = THREE.SRGBColorSpace;
        map.anisotropy = 8;
        return new THREE.MeshPhysicalMaterial({
          map,
          metalness: f.metalness,
          roughness: f.roughness,
          clearcoat: 1,
          clearcoatRoughness: 0.06,
          envMapIntensity: f.env ?? 0.75,
        });
      };

      // ID-1 card: 85.6 × 54 mm with 3.18 mm corner radius (scaled ×100), 0.8 mm thick.
      const W = 8.56;
      const H = 5.4;
      const R = 0.32;
      const T = 0.08;
      const outline = new THREE.Shape();
      outline.moveTo(-W / 2 + R, -H / 2);
      outline.lineTo(W / 2 - R, -H / 2);
      outline.quadraticCurveTo(W / 2, -H / 2, W / 2, -H / 2 + R);
      outline.lineTo(W / 2, H / 2 - R);
      outline.quadraticCurveTo(W / 2, H / 2, W / 2 - R, H / 2);
      outline.lineTo(-W / 2 + R, H / 2);
      outline.quadraticCurveTo(-W / 2, H / 2, -W / 2, H / 2 - R);
      outline.lineTo(-W / 2, -H / 2 + R);
      outline.quadraticCurveTo(-W / 2, -H / 2, -W / 2 + R, -H / 2);
      const body = new THREE.ExtrudeGeometry(outline, { depth: T, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 10 });
      body.translate(0, 0, -T / 2);
      const faceGeometry = new THREE.ShapeGeometry(outline, 10);
      const uv = faceGeometry.attributes.uv!;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + W / 2) / W, (uv.getY(i) + H / 2) / H);

      const card = new THREE.Group();
      const edgeMesh = new THREE.Mesh(body);
      const frontMesh = new THREE.Mesh(faceGeometry);
      frontMesh.position.z = T / 2 + 0.013;
      const backMesh = new THREE.Mesh(faceGeometry);
      backMesh.position.z = -T / 2 - 0.013;
      backMesh.rotation.y = Math.PI;
      card.add(edgeMesh, frontMesh, backMesh);
      const dress = (t: CardTier) => {
        const f = FINISH[t];
        const previous = [edgeMesh.material, frontMesh.material, backMesh.material] as import("three").Material[];
        edgeMesh.material = new THREE.MeshPhysicalMaterial({ color: f.edge, metalness: 1, roughness: 0.3, clearcoat: 0.6 });
        frontMesh.material = faceMaterial(drawFace(initial.current.labels, t, false), f);
        backMesh.material = faceMaterial(drawFace(initial.current.labels, t, true), f);
        for (const m of previous) {
          (m as import("three").MeshPhysicalMaterial).map?.dispose();
          m.dispose();
        }
      };
      dress(initial.current.tier);
      const pivot = new THREE.Group();
      pivot.add(card);
      scene.add(pivot);
      let current = initial.current.tier;

      // Soft contact shadow under the card.
      const shade = document.createElement("canvas");
      shade.width = shade.height = 128;
      const sg = shade.getContext("2d")!;
      const radial = sg.createRadialGradient(64, 64, 0, 64, 64, 64);
      radial.addColorStop(0, "rgba(0,0,0,0.55)");
      radial.addColorStop(1, "rgba(0,0,0,0)");
      sg.fillStyle = radial;
      sg.fillRect(0, 0, 128, 128);
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 2.6),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shade), transparent: true, depthWrite: false }),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(0, -3.7, 0);
      scene.add(shadow);

      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      camera.position.set(0, 0.6, 15.5);
      camera.lookAt(0, -0.2, 0);
      const resize = () => {
        const w = container.clientWidth || 1;
        const h = container.clientHeight || 1;
        camera.aspect = w / h;
        camera.position.z = camera.aspect < 1 ? 15.5 / camera.aspect : 15.5;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      };
      resize();

      const state = { turn: 0, spin: 0 };
      const pointer = { x: 0, y: 0, cx: 0, cy: 0 };
      const step = () => {
        pointer.cx += (pointer.x - pointer.cx) * 0.08;
        pointer.cy += (pointer.y - pointer.cy) * 0.08;
        pivot.rotation.set(-0.16 + pointer.cy * 0.12, -0.42 + state.turn * 0.84 + pointer.cx * 0.2, 0.04);
        card.rotation.y = state.spin;
        renderer.render(scene, camera);
        return Math.abs(pointer.x - pointer.cx) + Math.abs(pointer.y - pointer.cy) > 0.001;
      };
      const loop = createLoop(container, flags.small, step);
      const ro = new ResizeObserver(() => {
        resize();
        loop.invalidate();
      });
      ro.observe(container);

      const swap = dress;
      let spinTween: ReturnType<typeof gsap.to> | null = null;
      setTierRef.current = (next) => {
        if (next === current) return;
        current = next;
        if (flags.reduced) {
          swap(next);
          loop.invalidate();
          return;
        }
        spinTween?.kill();
        let swapped = false;
        state.spin = 0;
        spinTween = gsap.to(state, {
          spin: Math.PI * 2,
          duration: 1.1,
          ease: "power3.inOut",
          onUpdate: () => {
            // Swap the finish while the card is edge-on, so the change is never seen.
            if (!swapped && state.spin >= Math.PI / 2) {
              swapped = true;
              swap(next);
            }
            loop.invalidate();
          },
          onComplete: () => {
            state.spin = 0;
            loop.invalidate();
          },
        });
      };

      gsap.registerPlugin(ScrollTrigger);
      const section = container.closest("section") ?? container;
      const trigger =
        flags.reduced || flags.capture
          ? null
          : ScrollTrigger.create({
              trigger: section,
              start: "top 70%",
              end: "bottom 30%",
              scrub: 0.8,
              onUpdate: (self) => {
                state.turn = self.progress;
                const index = Math.min(CARD_TIERS.length - 1, Math.floor(self.progress * CARD_TIERS.length));
                initial.current.onScrollTier(CARD_TIERS[index]!);
                loop.invalidate();
              },
            });
      if (flags.capture) state.turn = 0.35;
      const finePointer = window.matchMedia("(pointer: fine)").matches && !flags.reduced && !flags.capture;
      const onPointer = (event: PointerEvent) => {
        const r = container.getBoundingClientRect();
        pointer.x = Math.max(-1, Math.min(1, ((event.clientX - r.left) / r.width - 0.5) * 2));
        pointer.y = Math.max(-1, Math.min(1, -((event.clientY - r.top) / r.height - 0.5) * 2));
        loop.invalidate();
      };
      if (finePointer) container.addEventListener("pointermove", onPointer, { passive: true });

      if (flags.capture) {
        const w = window as Window & { __jpCapture?: Record<string, (t?: CardTier) => string> };
        w.__jpCapture = {
          ...w.__jpCapture,
          card: (t?: CardTier) => {
            if (t && t !== current) {
              current = t;
              swap(t);
            }
            step();
            return renderer.domElement.toDataURL("image/webp", 0.86);
          },
        };
      }
      requestAnimationFrame(() => !disposed && setReady(true));

      teardown = () => {
        loop.stop();
        ro.disconnect();
        trigger?.kill();
        spinTween?.kill();
        container.removeEventListener("pointermove", onPointer);
        disposeScene(scene);
        envTarget.dispose();
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        setTierRef.current = () => {};
      };
    });

    return () => {
      disposed = true;
      cancelStart();
      teardown();
    };
  }, []);

  useEffect(() => {
    setTierRef.current(tier);
  }, [tier]);

  return <div ref={host} className="scene" data-ready={ready} />;
}
