"use client";

import { useEffect, useRef, useState } from "react";
import * as tokens from "@jungle/design-tokens/tokens";
import { afterLoadIdle, createLoop, disposeScene, hasRealGpu, sceneFlags, usesSoftwareRendering } from "@/lib/webgl";

/**
 * Hero scene: the view from the lounge suspended 3 m above the courts (owner, 27.09.2026).
 * Physically based materials (polished resin floor, glass walls with environment reflections,
 * brushed steel, champagne handrail) lit like a bright hall. Scrolling through the hero lowers
 * the gaze towards the courts (GSAP ScrollTrigger, scrubbed); a fine pointer adds a slight parallax.
 * The layout is illustrative, not the architectural project (the render note says so).
 */

// Metres. Four courts (10 × 20 m) one behind the other, long side towards the lounge.
const COURT_Z = [5, -7, -19, -31];
const HALL_X = 17;
const LOUNGE_Y = 3;
const EYE = LOUNGE_Y + 1.62;
const LOUNGE_EDGE = 13; // z of the balustrade, 3 m from the nearest court

function courtTexture(THREE: typeof import("three")) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 1024;
  const g = canvas.getContext("2d")!;
  g.fillStyle = tokens.ColorNavy700;
  g.fillRect(0, 0, 512, 1024);
  // Fine turf grain so the surface does not look like plastic.
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.06)";
    g.fillRect(Math.random() * 512, Math.random() * 1024, 1.6, 1.6);
  }
  const m = 1024 / 20; // px per metre
  g.fillStyle = "rgba(255,255,255,0.92)";
  const line = 0.05 * m;
  const service = 6.95; // service lines, 6.95 m from the net
  g.fillRect(0, (10 - service) * m - line / 2, 512, line);
  g.fillRect(0, (10 + service) * m - line / 2, 512, line);
  g.fillRect(256 - line / 2, (10 - service) * m, line, service * 2 * m);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function meshTexture(THREE: typeof import("three")) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const g = canvas.getContext("2d")!;
  g.strokeStyle = "#ffffff";
  g.lineWidth = 2;
  g.strokeRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

export default function ArenaScene() {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

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
      if (disposed) return;
      const flags = sceneFlags();

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          powerPreference: "high-performance",
          preserveDrawingBuffer: flags.capture,
        });
      } catch {
        return; // no WebGL: the static render stays
      }
      if (!flags.forced && usesSoftwareRendering(renderer)) {
        renderer.dispose();
        return;
      }
      const small = flags.small;
      renderer.setPixelRatio(flags.capture ? (small ? 2 : 1) : Math.min(window.devicePixelRatio, small ? 1.5 : 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.NeutralToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = !small;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.setAttribute("aria-hidden", "true");
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const air = new THREE.Color(tokens.ColorSurface100);
      scene.background = air;
      scene.fog = new THREE.Fog(air, 34, 78);
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
      scene.environment = envTarget.texture;
      scene.environmentIntensity = 0.75;

      // Light: soft skylight plus a warm key light through the roof glazing.
      scene.add(new THREE.HemisphereLight(0xffffff, 0xc9d1da, 0.75));
      const sun = new THREE.DirectionalLight(0xfff1de, 2.8);
      sun.position.set(-22, 30, -8);
      sun.castShadow = !small;
      sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 24, bottom: -24, near: 1, far: 90 });
      sun.shadow.bias = -0.0004;
      sun.shadow.normalBias = 0.02;
      scene.add(sun);

      // Materials (physically based).
      const resin = new THREE.MeshStandardMaterial({ color: 0xd8dde3, roughness: 0.22, metalness: 0 });
      const apron = new THREE.MeshStandardMaterial({ color: 0xc9d0d8, roughness: 0.6 });
      const wall = new THREE.MeshStandardMaterial({ color: 0xeef2f6, roughness: 0.85 });
      const steel = new THREE.MeshStandardMaterial({ color: 0x2b3440, roughness: 0.34, metalness: 0.8 });
      const screen = new THREE.MeshPhysicalMaterial({
        color: 0x05080d,
        emissive: tokens.ColorNavy700,
        emissiveIntensity: 0.35,
        roughness: 0.08,
        clearcoat: 1,
      });
      const champagne = new THREE.MeshStandardMaterial({ color: tokens.ColorMetalGold, roughness: 0.24, metalness: 1 });
      const concrete = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.7 });
      const glass = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.03,
        metalness: 0,
        transparent: true,
        opacity: 0.14,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        envMapIntensity: 1.6,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const grid = meshTexture(THREE);
      const mesh = new THREE.MeshStandardMaterial({
        color: 0x3a4655,
        alphaMap: grid,
        transparent: true,
        roughness: 0.5,
        metalness: 0.6,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const turf = new THREE.MeshStandardMaterial({ map: courtTexture(THREE), roughness: 0.92 });
      const led = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.4 });

      const world = new THREE.Group();
      scene.add(world);
      /** A plane whose mesh texture keeps 8 cm cells whatever its size (reads as a fine haze from afar). */
      const meshPlane = (w: number, h: number) => {
        const geometry = new THREE.PlaneGeometry(w, h);
        const uv = geometry.attributes.uv!;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / 0.08), uv.getY(i) * (h / 0.08));
        return geometry;
      };
      const add = (geometry: import("three").BufferGeometry, material: import("three").Material, x: number, y: number, z: number, shadows = true) => {
        const m = new THREE.Mesh(geometry, material);
        m.position.set(x, y, z);
        m.castShadow = shadows && !small;
        m.receiveShadow = !small;
        world.add(m);
        return m;
      };

      // Hall shell.
      const floor = add(new THREE.PlaneGeometry(80, 80), resin, 0, 0, -12, false);
      floor.rotation.x = -Math.PI / 2;
      add(new THREE.BoxGeometry(40, 13, 0.4), wall, 0, 6.5, -38, false);
      add(new THREE.BoxGeometry(0.4, 13, 70), wall, -HALL_X, 6.5, -6, false);
      add(new THREE.BoxGeometry(0.4, 13, 70), wall, HALL_X, 6.5, -6, false);
      // Clerestory glazing on the side walls: the daylight source of the hall.
      for (const side of [-1, 1]) {
        const band = add(new THREE.PlaneGeometry(66, 2.2), led, side * (HALL_X - 0.22), 9.6, -6, false);
        band.rotation.y = -side * (Math.PI / 2);
        for (let z = -36; z <= 22; z += 4) add(new THREE.BoxGeometry(0.5, 13, 0.25), wall, side * (HALL_X - 0.3), 6.5, z);
      }
      add(new THREE.PlaneGeometry(30, 2.2), led, 0, 9.6, -37.78, false);
      // Roof trusses and linear LED fixtures above every court.
      for (let z = -36; z <= 14; z += 6) add(new THREE.BoxGeometry(HALL_X * 2, 0.5, 0.3), steel, 0, 11.2, z, false);
      for (const z of COURT_Z) {
        add(new THREE.BoxGeometry(15, 0.08, 0.18), led, 0, 10.4, z - 2.5, false);
        add(new THREE.BoxGeometry(15, 0.08, 0.18), led, 0, 10.4, z + 2.5, false);
        // A screen at every court (players, rank, time left), at its end wall.
        const display = add(new THREE.BoxGeometry(0.12, 2, 3.6), screen, HALL_X - 0.35, 5.2, z, false);
        display.castShadow = false;
      }

      // Courts, built along their local z axis (10 × 20 m) and turned to face the lounge.
      const postGeometry = new THREE.BoxGeometry(0.06, 1, 0.06);
      for (const cz of COURT_Z) {
        const court = new THREE.Group();
        court.position.set(0, 0, cz);
        court.rotation.y = Math.PI / 2;
        world.add(court);
        const put = (geometry: import("three").BufferGeometry, material: import("three").Material, x: number, y: number, z: number, ry = 0) => {
          const m = new THREE.Mesh(geometry, material);
          m.position.set(x, y, z);
          m.rotation.y = ry;
          m.receiveShadow = !small;
          court.add(m);
          return m;
        };
        const posts: import("three").Matrix4[] = [];
        const post = (x: number, z: number, h: number) =>
          posts.push(new THREE.Matrix4().compose(new THREE.Vector3(x, h / 2, z), new THREE.Quaternion(), new THREE.Vector3(1, h, 1)));

        put(new THREE.PlaneGeometry(11.6, 21.6), apron, 0, 0.004, 0).rotation.x = -Math.PI / 2;
        put(new THREE.PlaneGeometry(10, 20), turf, 0, 0.008, 0).rotation.x = -Math.PI / 2;
        for (const end of [-1, 1]) {
          const z = end * 10;
          // Back wall: 3 m of glass, 1 m of mesh above it.
          put(new THREE.PlaneGeometry(10, 3), glass, 0, 1.5, z);
          put(meshPlane(10, 1), mesh, 0, 3.5, z);
          for (const side of [-1, 1]) {
            const x = side * 5;
            // Side glass: 2 m at 3 m high, then 2 m at 2 m high; mesh along the middle.
            put(new THREE.PlaneGeometry(2, 3), glass, x, 1.5, z - end * 1, Math.PI / 2);
            put(new THREE.PlaneGeometry(2, 2), glass, x, 1, z - end * 3, Math.PI / 2);
            for (let k = 0; k <= 4; k += 2) post(x, z - end * k, k === 0 ? 4 : 3);
          }
          for (let k = -4; k <= 4; k += 2) post(k, z, 4);
        }
        for (const side of [-1, 1]) {
          put(meshPlane(12, 3), mesh, side * 5, 1.5, 0, Math.PI / 2);
          for (let z = -4; z <= 4; z += 2) post(side * 5, z, 3);
        }
        // Net with its white headband and two posts.
        put(meshPlane(10, 0.84), mesh, 0, 0.46, 0);
        put(new THREE.BoxGeometry(10, 0.05, 0.02), concrete, 0, 0.9, 0);
        put(new THREE.CylinderGeometry(0.04, 0.04, 0.92, 12), steel, -5.1, 0.46, 0);
        put(new THREE.CylinderGeometry(0.04, 0.04, 0.92, 12), steel, 5.1, 0.46, 0);
        const instanced = new THREE.InstancedMesh(postGeometry, steel, posts.length);
        posts.forEach((matrix, i) => instanced.setMatrixAt(i, matrix));
        instanced.castShadow = !small;
        court.add(instanced);
      }

      // The lounge edge in the foreground: slab, frameless glass balustrade, champagne handrail.
      add(new THREE.BoxGeometry(HALL_X * 2, 0.32, 10), concrete, 0, LOUNGE_Y - 0.16, LOUNGE_EDGE + 5);
      add(new THREE.BoxGeometry(HALL_X * 2, 0.3, 0.02), steel, 0, LOUNGE_Y - 0.16, LOUNGE_EDGE, false);
      add(new THREE.PlaneGeometry(HALL_X * 2, 1.05), glass, 0, LOUNGE_Y + 0.52, LOUNGE_EDGE + 0.15, false);
      const rail = add(new THREE.CylinderGeometry(0.03, 0.03, HALL_X * 2, 20), champagne, 0, LOUNGE_Y + 1.08, LOUNGE_EDGE + 0.15);
      rail.rotation.z = Math.PI / 2;

      // Camera: standing in the lounge, looking diagonally across the courts; scrolling lowers the gaze.
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 160);
      const from = small
        ? { pos: new THREE.Vector3(-1, EYE, LOUNGE_EDGE + 1.8), look: new THREE.Vector3(1, -1.2, -8) }
        : { pos: new THREE.Vector3(-7, EYE, LOUNGE_EDGE + 3.4), look: new THREE.Vector3(3, -0.4, -10) };
      const to = small
        ? { pos: new THREE.Vector3(-0.8, EYE - 0.3, LOUNGE_EDGE + 1.2), look: new THREE.Vector3(0.5, -3, -2) }
        : { pos: new THREE.Vector3(-5.5, EYE - 0.3, LOUNGE_EDGE + 2), look: new THREE.Vector3(2, -2.6, -4) };
      const state = { progress: 0 };
      const pointer = { x: 0, y: 0, cx: 0, cy: 0 };
      const look = new THREE.Vector3();

      const resize = () => {
        const w = container.clientWidth || 1;
        const h = container.clientHeight || 1;
        camera.aspect = w / h;
        camera.fov = camera.aspect < 0.8 ? 56 : camera.aspect < 1.3 ? 46 : 38;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      };
      resize();

      const step = () => {
        pointer.cx += (pointer.x - pointer.cx) * 0.08;
        pointer.cy += (pointer.y - pointer.cy) * 0.08;
        const p = state.progress;
        camera.position.lerpVectors(from.pos, to.pos, p);
        camera.position.x += pointer.cx * 0.9;
        camera.position.y += pointer.cy * 0.25;
        look.lerpVectors(from.look, to.look, p);
        camera.lookAt(look);
        renderer.render(scene, camera);
        return Math.abs(pointer.x - pointer.cx) + Math.abs(pointer.y - pointer.cy) > 0.001;
      };
      const loop = createLoop(container, small, step);

      const ro = new ResizeObserver(() => {
        resize();
        loop.invalidate();
      });
      ro.observe(container);

      gsap.registerPlugin(ScrollTrigger);
      const hero = container.closest("section") ?? container;
      const tween = flags.reduced || flags.capture
        ? null
        : gsap.to(state, {
            progress: 1,
            ease: "none",
            onUpdate: loop.invalidate,
            scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.8 },
          });
      const finePointer = window.matchMedia("(pointer: fine)").matches && !flags.reduced && !flags.capture;
      const onPointer = (event: PointerEvent) => {
        pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
        pointer.y = -(event.clientY / window.innerHeight - 0.5) * 2;
        loop.invalidate();
      };
      if (finePointer) window.addEventListener("pointermove", onPointer, { passive: true });

      if (flags.capture) {
        const w = window as Window & { __jpCapture?: Record<string, () => string> };
        w.__jpCapture = { ...w.__jpCapture, arena: () => (step(), renderer.domElement.toDataURL("image/webp", 0.86)) };
      }
      requestAnimationFrame(() => !disposed && setReady(true));

      teardown = () => {
        loop.stop();
        ro.disconnect();
        tween?.scrollTrigger?.kill();
        tween?.kill();
        window.removeEventListener("pointermove", onPointer);
        disposeScene(scene);
        envTarget.dispose();
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    });

    return () => {
      disposed = true;
      cancelStart();
      teardown();
    };
  }, []);

  return <div ref={host} className="scene" data-ready={ready} />;
}
