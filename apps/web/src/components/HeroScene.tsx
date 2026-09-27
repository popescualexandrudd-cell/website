"use client";

import { useEffect, useRef } from "react";

/**
 * Real-time 3D hero (Three.js): a padel court with glowing glass walls, a bouncing ball with
 * a neon trail, hanging jungle leaves, fireflies and moving club lights. Loaded after the
 * first paint, paused when off-screen, a single still frame for reduced motion, and a CSS
 * backdrop underneath when WebGL is unavailable.
 */
/** True when WebGL runs on the CPU (SwiftShader, llvmpipe…): no real GPU available. */
function usesSoftwareRendering(renderer: import("three").WebGLRenderer): boolean {
  const gl = renderer.getContext();
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const name = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  return /swiftshader|llvmpipe|software|softpipe/i.test(name);
}

export default function HeroScene() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let disposed = false;
    let teardown: () => void = () => {};

    const start = async () => {
      const THREE = await import("three");
      if (disposed || !container) return;

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      } catch {
        return; // no WebGL: the CSS backdrop stays
      }
      const forced = new URLSearchParams(window.location.search).get("3d") === "force"; // demos / screenshots
      if (!forced && usesSoftwareRendering(renderer)) {
        renderer.dispose(); // no GPU: the 3D scene would make the page sluggish; the CSS backdrop stays
        return;
      }
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const small = window.innerWidth < 720;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 1.75));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x040c09, 0.045);
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
      const cameraBase = new THREE.Vector3(small ? 0 : -1, small ? 9 : 7.5, small ? 22 : 17);

      // Lights: dim jungle ambience + moving neon club lights.
      scene.add(new THREE.HemisphereLight(0x2be8d2, 0x040c09, 0.35));
      const orchid = new THREE.PointLight(0xff3da5, 60, 30, 1.6);
      const toucan = new THREE.PointLight(0xff8a1f, 45, 26, 1.6);
      const lagoon = new THREE.PointLight(0x2be8d2, 35, 26, 1.6);
      scene.add(orchid, toucan, lagoon);

      // Court (10 m × 20 m), turned so we look at it diagonally.
      const court = new THREE.Group();
      court.rotation.y = small ? -0.35 : -0.9;
      court.position.set(small ? 0.5 : 10, 0, small ? -9 : -7);
      scene.add(court);

      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 20),
        new THREE.MeshStandardMaterial({ color: 0x1180a0, emissive: 0x06384a, roughness: 0.8, metalness: 0.05 }),
      );
      floor.rotation.x = -Math.PI / 2;
      court.add(floor);

      const surround = new THREE.Mesh(
        new THREE.CircleGeometry(40, 48),
        new THREE.MeshStandardMaterial({ color: 0x06140f, roughness: 1 }),
      );
      surround.rotation.x = -Math.PI / 2;
      surround.position.y = -0.01;
      scene.add(surround);

      const lineMat = new THREE.LineBasicMaterial({ color: 0xf6ebd9, transparent: true, opacity: 0.85 });
      const lines = (points: number[][]) => {
        const g = new THREE.BufferGeometry().setFromPoints(points.map(([x, z]) => new THREE.Vector3(x, 0.01, z)));
        court.add(new THREE.LineSegments(g, lineMat));
      };
      lines([[-5, -10], [5, -10], [5, -10], [5, 10], [5, 10], [-5, 10], [-5, 10], [-5, -10]]);
      lines([[-5, -6.95], [5, -6.95], [-5, 6.95], [5, 6.95], [0, -6.95], [0, 6.95]]);

      const net = new THREE.Mesh(
        new THREE.BoxGeometry(10, 0.88, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x0b1a14, transparent: true, opacity: 0.85 }),
      );
      net.position.y = 0.44;
      court.add(net);
      const netTape = new THREE.Mesh(
        new THREE.BoxGeometry(10, 0.06, 0.06),
        new THREE.MeshBasicMaterial({ color: 0xf6ebd9 }),
      );
      netTape.position.y = 0.88;
      court.add(netTape);

      // Glass walls with neon edges (back walls 3 m; side glass 4 m, then mesh).
      const glassMat = new THREE.MeshBasicMaterial({ color: 0x2be8d2, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false });
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x2be8d2, transparent: true, opacity: 0.9 });
      const glass = (w: number, h: number, x: number, z: number, rotY: number) => {
        const geo = new THREE.PlaneGeometry(w, h);
        const pane = new THREE.Mesh(geo, glassMat);
        pane.position.set(x, h / 2, z);
        pane.rotation.y = rotY;
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
        pane.add(edges);
        court.add(pane);
      };
      for (const z of [-10, 10]) glass(10, 3, 0, z, 0);
      for (const x of [-5, 5]) {
        glass(4, 3, x, -8, Math.PI / 2);
        glass(4, 3, x, 8, Math.PI / 2);
      }
      const meshMat = new THREE.LineBasicMaterial({ color: 0x7ff3e4, transparent: true, opacity: 0.12 });
      for (const x of [-5, 5]) {
        const pts: import("three").Vector3[] = [];
        for (let z = -6; z <= 6; z += 0.5) pts.push(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, 3, z));
        for (let y = 0; y <= 3; y += 0.5) pts.push(new THREE.Vector3(x, y, -6), new THREE.Vector3(x, y, 6));
        court.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), meshMat));
      }

      // Ball with glow and neon trail.
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0xffd84d, emissive: 0xffd84d, emissiveIntensity: 1.6 }),
      );
      const ballLight = new THREE.PointLight(0xffd84d, 8, 6, 2);
      ball.add(ballLight);
      court.add(ball);
      const TRAIL = 36;
      const trailPositions = new Float32Array(TRAIL * 3);
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
      const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xff3da5, transparent: true, opacity: 0.7 }));
      court.add(trail);

      // Jungle leaves hanging from the ceiling (monstera-like shapes).
      const leafShape = new THREE.Shape();
      leafShape.moveTo(0, 0);
      leafShape.bezierCurveTo(0.9, 0.4, 1.1, 1.6, 0, 2.6);
      leafShape.bezierCurveTo(-1.1, 1.6, -0.9, 0.4, 0, 0);
      const leafGeo = new THREE.ShapeGeometry(leafShape, 12);
      const leafMats = [0x1f8a5b, 0x34b67b, 0x0f5c3c].map(
        (c) => new THREE.MeshStandardMaterial({ color: c, emissive: 0x0a3322, roughness: 0.6, side: THREE.DoubleSide }),
      );
      const leaves: { mesh: import("three").Mesh; phase: number; baseZ: number }[] = [];
      const leafCount = small ? 16 : 30;
      for (let i = 0; i < leafCount; i++) {
        const mat = leafMats[i % leafMats.length]!;
        const leaf = new THREE.Mesh(leafGeo, mat);
        const angle = (i / leafCount) * Math.PI * 2;
        const radius = 7 + (i % 5) * 1.6;
        leaf.position.set(Math.cos(angle) * radius, 7.5 + (i % 3) * 1.2, Math.sin(angle) * radius - 3);
        leaf.rotation.set(Math.PI, angle, 0.3 * ((i % 2) * 2 - 1));
        const s = 0.9 + (i % 4) * 0.35;
        leaf.scale.set(s, s, s);
        scene.add(leaf);
        leaves.push({ mesh: leaf, phase: i * 0.7, baseZ: leaf.rotation.z });
      }
      // Two big foreground fronds framing the view.
      for (const side of [-1, 1]) {
        const frond = new THREE.Mesh(leafGeo, leafMats[2]!);
        frond.scale.setScalar(3.2);
        frond.position.set(side * (small ? 6 : 11), 9, 4);
        frond.rotation.set(Math.PI, side * 0.6, side * 0.9);
        scene.add(frond);
        leaves.push({ mesh: frond, phase: side * 2, baseZ: frond.rotation.z });
      }

      // Fireflies.
      const FLIES = small ? 160 : 320;
      const flyPos = new Float32Array(FLIES * 3);
      const flySeed = new Float32Array(FLIES);
      for (let i = 0; i < FLIES; i++) {
        flyPos[i * 3] = (Math.random() - 0.5) * 40;
        flyPos[i * 3 + 1] = Math.random() * 10;
        flyPos[i * 3 + 2] = (Math.random() - 0.5) * 34 - 4;
        flySeed[i] = Math.random() * Math.PI * 2;
      }
      const flyGeo = new THREE.BufferGeometry();
      flyGeo.setAttribute("position", new THREE.BufferAttribute(flyPos, 3));
      const flies = new THREE.Points(
        flyGeo,
        new THREE.PointsMaterial({ color: 0xffd84d, size: 0.09, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      scene.add(flies);

      // Sizing, pointer parallax, visibility.
      const resize = () => {
        const { clientWidth: w, clientHeight: h } = container;
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(h, 1);
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(container);
      resize();

      const pointer = { x: 0, y: 0 };
      const onPointer = (e: PointerEvent) => {
        pointer.x = e.clientX / window.innerWidth - 0.5;
        pointer.y = e.clientY / window.innerHeight - 0.5;
      };
      window.addEventListener("pointermove", onPointer, { passive: true });

      let visible = true;
      const io = new IntersectionObserver(([entry]) => {
        visible = Boolean(entry?.isIntersecting);
      });
      io.observe(container);

      const clock = new THREE.Timer();
      const target = new THREE.Vector3(small ? 0.5 : 6.5, 0.5, small ? -9 : -7);
      let frame = 0;
      const render = (t: number) => {
        // Ball: bounces across the court.
        const bx = Math.sin(t * 0.7) * 3.6;
        const bz = Math.sin(t * 0.45) * 8;
        const by = 0.2 + Math.abs(Math.sin(t * 2.4)) * 2.4;
        ball.position.set(bx, by, bz);
        trailPositions.copyWithin(3, 0, (TRAIL - 1) * 3);
        trailPositions[0] = bx;
        trailPositions[1] = by;
        trailPositions[2] = bz;
        trailGeo.attributes.position!.needsUpdate = true;

        orchid.position.set(Math.sin(t * 0.4) * 9, 6, Math.cos(t * 0.4) * 8 - 2);
        toucan.position.set(Math.cos(t * 0.33) * 8, 5, Math.sin(t * 0.33) * 9 - 2);
        lagoon.position.set(Math.sin(t * 0.25 + 2) * 6, 3, Math.cos(t * 0.25 + 2) * 6);

        for (const leaf of leaves) leaf.mesh.rotation.z = leaf.baseZ + Math.sin(t * 0.8 + leaf.phase) * 0.08;

        for (let i = 0; i < FLIES; i++) {
          flyPos[i * 3 + 1]! += Math.sin(t + flySeed[i]!) * 0.004;
          flyPos[i * 3]! += Math.cos(t * 0.5 + flySeed[i]!) * 0.003;
        }
        flyGeo.attributes.position!.needsUpdate = true;

        camera.position.x += (cameraBase.x + pointer.x * 2.4 - camera.position.x) * 0.04;
        camera.position.y += (cameraBase.y - pointer.y * 1.4 - camera.position.y) * 0.04;
        camera.position.z = cameraBase.z;
        camera.lookAt(target);
        renderer.render(scene, camera);
      };

      camera.position.copy(cameraBase);
      if (reduced) {
        render(1.3);
      } else {
        const minFrameMs = small ? 1000 / 30 : 0; // 30 fps on phones saves battery
        let last = 0;
        const loop = (now: number) => {
          frame = requestAnimationFrame(loop);
          if (!visible || document.hidden || now - last < minFrameMs) return;
          last = now;
          clock.update(now);
          render(clock.getElapsed());
        };
        frame = requestAnimationFrame(loop);
      }
      container.dataset.ready = "true";

      teardown = () => {
        cancelAnimationFrame(frame);
        ro.disconnect();
        io.disconnect();
        window.removeEventListener("pointermove", onPointer);
        scene.traverse((obj) => {
          const mesh = obj as import("three").Mesh;
          mesh.geometry?.dispose();
          const material = mesh.material as import("three").Material | import("three").Material[] | undefined;
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else material?.dispose();
        });
        renderer.dispose();
        renderer.domElement.remove();
      };
    };

    // Start only after the page has fully loaded and the browser is idle: text first (LCP), 3D after.
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (window.requestIdleCallback) window.requestIdleCallback(() => void start(), { timeout: 2000 });
        else void start();
      }, 1200);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      window.removeEventListener("load", schedule);
      teardown();
    };
  }, []);

  return <div ref={host} className="hero-canvas" aria-hidden="true" />;
}
