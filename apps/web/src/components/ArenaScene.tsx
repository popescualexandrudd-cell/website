"use client";

import { useEffect, useRef, useState } from "react";
import * as tokens from "@jungle/design-tokens/tokens";
import { afterLoadIdle, offScreen, createLoop, disposeScene, realGpu, sceneFlags, usesSoftwareRendering } from "@/lib/webgl";

/**
 * Hero scene, after the owner's site sketch (27.09.2026): four courts in two rows (2 × 2) and,
 * between the rows, a gallery-lounge 3 m up with glass balustrades on both sides. We stand on
 * the gallery at night: forest-green courts under linear LED light, glass walls reflecting it,
 * dark polished floor, brass handrails (palette B4). Scrolling lowers the gaze towards the
 * courts (GSAP ScrollTrigger, scrubbed); a fine pointer adds a slight parallax.
 * Dimensions are illustrative, not the architectural project (the render note says so).
 */

// Metres. Courts are 10 × 20 m, long side along z. Rows at z < 0 and z > 0, the gallery between.
const COURT_X = [-6, 6];
const GALLERY_HALF = 1.6; // the gallery is 3.2 m wide
const ROW_Z = [-(GALLERY_HALF + 2.5 + 10), GALLERY_HALF + 2.5 + 10]; // court centres, 2.5 m aprons
const HALL_X = 14;
const HALL_Z = 28;
const LOUNGE_Y = 3;
const EYE = LOUNGE_Y + 1.62;

function courtTexture(THREE: typeof import("three")) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 1024;
  const g = canvas.getContext("2d")!;
  g.fillStyle = tokens.ColorForest700;
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

export default function ArenaScene({ waitForVideo = false }: { waitForVideo?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let disposed = false;
    let teardown = () => {};

    const cancelStart = afterLoadIdle(async () => {
      if (!sceneFlags().forced && !(await realGpu())) return; // the static render stays
      // On a phone the video and the 3D hall never run together: the hall waits until the hero
      // (and its video) has left the screen (ADR-0023).
      if (waitForVideo && sceneFlags().small) await offScreen(container);
      if (disposed) return;
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
      renderer.toneMappingExposure = 1.3;
      renderer.shadowMap.enabled = !small;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.setAttribute("aria-hidden", "true");
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const air = new THREE.Color(tokens.ColorNight900);
      scene.background = air;
      scene.fog = new THREE.Fog(air, 30, 70);
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
      scene.environment = envTarget.texture;
      scene.environmentIntensity = 0.28; // an evening hall: reflections, not daylight

      // Light: a dim cool fill, a warm key from above the courts and the LED lines themselves.
      scene.add(new THREE.HemisphereLight(0x9fb4d0, 0x0a1320, 0.55));
      const key = new THREE.DirectionalLight(0xffe7c2, 2.2);
      key.position.set(-10, 26, -6);
      key.castShadow = !small;
      key.shadow.mapSize.set(2048, 2048);
      Object.assign(key.shadow.camera, { left: -26, right: 26, top: 30, bottom: -30, near: 1, far: 80 });
      key.shadow.bias = -0.0004;
      key.shadow.normalBias = 0.02;
      scene.add(key);
      for (const x of COURT_X) {
        for (const z of ROW_Z) {
          const pool = new THREE.PointLight(0xfff1dc, 110, 24, 1.8);
          pool.position.set(x, 9, z);
          scene.add(pool);
        }
      }

      // Materials (physically based).
      const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x141c26, roughness: 0.18, metalness: 0.1 });
      const apron = new THREE.MeshStandardMaterial({ color: 0x1a2331, roughness: 0.55 });
      const wall = new THREE.MeshStandardMaterial({ color: tokens.ColorNight700, roughness: 0.8 });
      const steel = new THREE.MeshStandardMaterial({ color: 0x0c1118, roughness: 0.32, metalness: 0.85 });
      const screen = new THREE.MeshPhysicalMaterial({
        color: 0x020408,
        emissive: tokens.ColorNight600,
        emissiveIntensity: 0.9,
        roughness: 0.06,
        clearcoat: 1,
      });
      const brass = new THREE.MeshStandardMaterial({ color: tokens.ColorBrass400, roughness: 0.26, metalness: 1 });
      const slab = new THREE.MeshStandardMaterial({ color: 0x1b2533, roughness: 0.5 });
      const oak = new THREE.MeshStandardMaterial({ color: 0x33241a, roughness: 0.45 });
      const glass = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.03,
        metalness: 0,
        transparent: true,
        opacity: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        envMapIntensity: 2.2,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const grid = meshTexture(THREE);
      const mesh = new THREE.MeshStandardMaterial({
        color: 0x6b7686,
        alphaMap: grid,
        transparent: true,
        roughness: 0.5,
        metalness: 0.6,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const turf = new THREE.MeshStandardMaterial({ map: courtTexture(THREE), roughness: 0.9 });
      const led = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3e0, emissiveIntensity: 2.2 });
      const warmStrip = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: tokens.ColorBrass300, emissiveIntensity: 1.6 });

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

      // Hall shell: dark walls with vertical fins, a warm light line along the top.
      const floor = add(new THREE.PlaneGeometry(HALL_X * 2, HALL_Z * 2), floorMaterial, 0, 0, 0, false);
      floor.rotation.x = -Math.PI / 2;
      for (const side of [-1, 1]) {
        add(new THREE.BoxGeometry(0.4, 12, HALL_Z * 2), wall, side * HALL_X, 6, 0, false);
        add(new THREE.BoxGeometry(HALL_X * 2, 12, 0.4), wall, 0, 6, side * HALL_Z, false);
        const strip = add(new THREE.BoxGeometry(0.06, 0.12, HALL_Z * 2 - 1), warmStrip, side * (HALL_X - 0.25), 10.8, 0, false);
        strip.castShadow = false;
        for (let z = -HALL_Z + 2; z < HALL_Z; z += 3) add(new THREE.BoxGeometry(0.3, 12, 0.2), steel, side * (HALL_X - 0.3), 6, z, false);
      }
      add(new THREE.BoxGeometry(HALL_X * 2 - 1, 0.12, 0.06), warmStrip, 0, 10.8, -HALL_Z + 0.25, false);
      // Roof trusses and linear LED fixtures above every court.
      for (let z = -HALL_Z + 2; z < HALL_Z; z += 5) add(new THREE.BoxGeometry(HALL_X * 2, 0.5, 0.3), steel, 0, 11.4, z, false);
      for (const x of COURT_X) {
        for (const z of ROW_Z) {
          add(new THREE.BoxGeometry(0.18, 0.08, 16), led, x - 3, 10.2, z, false);
          add(new THREE.BoxGeometry(0.18, 0.08, 16), led, x + 3, 10.2, z, false);
          // A screen at every court (players, rank, time left), on the far wall of its row.
          const display = add(new THREE.BoxGeometry(3.6, 2, 0.12), screen, x, 5.4, Math.sign(z) * (HALL_Z - 0.35), false);
          display.castShadow = false;
        }
      }

      // Courts, built along their local z axis (10 × 20 m).
      const postGeometry = new THREE.BoxGeometry(0.06, 1, 0.06);
      for (const cx of COURT_X) {
        for (const cz of ROW_Z) {
          const court = new THREE.Group();
          court.position.set(cx, 0, cz);
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

          put(new THREE.PlaneGeometry(11.4, 21.4), apron, 0, 0.004, 0).rotation.x = -Math.PI / 2;
          put(new THREE.PlaneGeometry(10, 20), turf, 0, 0.008, 0).rotation.x = -Math.PI / 2;
          for (const end of [-1, 1]) {
            const z = end * 10;
            put(new THREE.PlaneGeometry(10, 3), glass, 0, 1.5, z);
            put(meshPlane(10, 1), mesh, 0, 3.5, z);
            for (const side of [-1, 1]) {
              const x = side * 5;
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
          put(meshPlane(10, 0.84), mesh, 0, 0.46, 0);
          put(new THREE.BoxGeometry(10, 0.05, 0.02), led, 0, 0.9, 0);
          put(new THREE.CylinderGeometry(0.04, 0.04, 0.92, 12), steel, -5.1, 0.46, 0);
          put(new THREE.CylinderGeometry(0.04, 0.04, 0.92, 12), steel, 5.1, 0.46, 0);
          const instanced = new THREE.InstancedMesh(postGeometry, steel, posts.length);
          posts.forEach((matrix, i) => instanced.setMatrixAt(i, matrix));
          instanced.castShadow = !small;
          court.add(instanced);
        }
      }

      // The gallery-lounge between the rows: slab on slender columns, oak deck, glass balustrades
      // with brass handrails on both sides, a warm light line under each edge.
      const galleryLength = HALL_X * 2 - 2;
      add(new THREE.BoxGeometry(galleryLength, 0.3, GALLERY_HALF * 2), slab, 0, LOUNGE_Y - 0.15, 0);
      add(new THREE.BoxGeometry(galleryLength, 0.03, GALLERY_HALF * 2 - 0.1), oak, 0, LOUNGE_Y + 0.015, 0, false);
      for (let x = -galleryLength / 2 + 2; x < galleryLength / 2; x += 6) {
        add(new THREE.CylinderGeometry(0.12, 0.12, LOUNGE_Y - 0.3, 16), steel, x, (LOUNGE_Y - 0.3) / 2, 0);
      }
      for (const side of [-1, 1]) {
        const z = side * GALLERY_HALF;
        const pane = add(new THREE.PlaneGeometry(galleryLength, 1.05), glass, 0, LOUNGE_Y + 0.52, z, false);
        pane.castShadow = false;
        const rail = add(new THREE.CylinderGeometry(0.03, 0.03, galleryLength, 20), brass, 0, LOUNGE_Y + 1.08, z);
        rail.rotation.z = Math.PI / 2;
        const glow = add(new THREE.BoxGeometry(galleryLength, 0.04, 0.04), warmStrip, 0, LOUNGE_Y - 0.32, z, false);
        glow.castShadow = false;
      }

      // Camera: standing on the gallery, looking over the balustrade at one row of courts;
      // scrolling lowers the gaze.
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 160);
      const from = small
        ? { pos: new THREE.Vector3(-2, EYE, 0.2), look: new THREE.Vector3(-4, -0.6, -16) }
        : { pos: new THREE.Vector3(-9, EYE, 0.4), look: new THREE.Vector3(2, -0.8, -16) };
      const to = small
        ? { pos: new THREE.Vector3(-2, EYE - 0.25, -0.6), look: new THREE.Vector3(-4, -2.6, -10) }
        : { pos: new THREE.Vector3(-8, EYE - 0.25, -0.4), look: new THREE.Vector3(1.5, -2.4, -10) };
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
  }, [waitForVideo]);

  return <div ref={host} className="scene" data-ready={ready} />;
}
