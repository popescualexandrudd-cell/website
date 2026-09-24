import {
  BackSide,
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Texture,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  clayGrainTexture,
  clayMacroTexture,
  lineTexture,
  netTexture,
  rng,
  skyTexture,
  windscreenTexture,
} from "./textures";

/** ITF court dimensions, in metres. The net runs along x at z = 0; y is up. */
export const COURT = {
  halfLength: 11.885,
  halfDoubles: 5.485,
  halfSingles: 4.115,
  serviceLine: 6.4,
  netPost: 6.399,
  netCentre: 0.914,
  netPostHeight: 1.07,
  surfaceHalfWidth: 9.145,
  surfaceHalfLength: 18.285,
} as const;

/** Height of the net's top cord at x (it sags between the posts). */
export function netHeightAt(x: number): number {
  const u = Math.min(1, Math.abs(x) / COURT.netPost);
  return COURT.netCentre + (COURT.netPostHeight - COURT.netCentre) * u * u;
}

type Rect = { x0: number; x1: number; z0: number; z1: number };

/** One flat quad per line, merged; UVs in metres so the dust texture keeps its scale. */
function linesGeometry(rects: Rect[]): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (const r of rects) {
    const base = positions.length / 3;
    const long = Math.abs(r.x1 - r.x0) > Math.abs(r.z1 - r.z0);
    positions.push(r.x0, 0, r.z0, r.x1, 0, r.z0, r.x1, 0, r.z1, r.x0, 0, r.z1);
    const lu = long ? r.x1 - r.x0 : r.z1 - r.z0;
    const lv = long ? r.z1 - r.z0 : r.x1 - r.x0;
    if (long) uvs.push(0, 0, lu, 0, lu, lv * 4, 0, lv * 4);
    else uvs.push(0, 0, 0, lv * 4, lu, lv * 4, lu, 0);
    indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function courtLines(): Rect[] {
  const w = 0.05;
  const base = 0.08;
  const { halfLength: L, halfDoubles: D, halfSingles: S, serviceLine: SL } = COURT;
  const rects: Rect[] = [];
  for (const sign of [-1, 1]) {
    // Baselines and the centre marks.
    rects.push({ x0: -D, x1: D, z0: sign * L - base / 2, z1: sign * L + base / 2 });
    rects.push({ x0: -w / 2, x1: w / 2, z0: sign * (L - 0.1), z1: sign * L });
    // Service lines.
    rects.push({ x0: -S, x1: S, z0: sign * SL - w / 2, z1: sign * SL + w / 2 });
    // Centre service line.
    rects.push({ x0: -w / 2, x1: w / 2, z0: Math.min(0, sign * SL), z1: Math.max(0, sign * SL) });
  }
  for (const x of [-D, -S, S, D]) {
    rects.push({ x0: x - w / 2, x1: x + w / 2, z0: -L, z1: L });
  }
  return rects.map((r) => ({
    x0: Math.min(r.x0, r.x1),
    x1: Math.max(r.x0, r.x1),
    z0: Math.min(r.z0, r.z1),
    z1: Math.max(r.z0, r.z1),
  }));
}

/** Net: a sagging mesh panel, the white headband, centre strap and the two posts. */
function buildNet(): Group {
  const group = new Group();
  const segX = 64;
  const segY = 6;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const cell = 0.27;
  for (let j = 0; j <= segY; j++) {
    for (let i = 0; i <= segX; i++) {
      const x = -COURT.netPost + (i / segX) * COURT.netPost * 2;
      const top = netHeightAt(x) - 0.03;
      const y = 0.02 + (j / segY) * (top - 0.02);
      positions.push(x, y, 0);
      uvs.push(x / cell, y / cell);
    }
  }
  for (let j = 0; j < segY; j++) {
    for (let i = 0; i < segX; i++) {
      const a = j * (segX + 1) + i;
      const b = a + 1;
      const c = a + segX + 1;
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }
  const netGeometry = new BufferGeometry();
  netGeometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  netGeometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  netGeometry.setIndex(indices);
  netGeometry.computeVertexNormals();
  const mesh = new Mesh(
    netGeometry,
    new MeshStandardMaterial({
      map: netTexture(),
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      roughness: 0.9,
      alphaTest: 0.02,
    }),
  );
  mesh.castShadow = true;
  group.add(mesh);

  // Headband: a thin ribbon following the cord.
  const band: number[] = [];
  const bandIdx: number[] = [];
  for (let i = 0; i <= segX; i++) {
    const x = -COURT.netPost + (i / segX) * COURT.netPost * 2;
    const top = netHeightAt(x);
    band.push(x, top, 0.012, x, top - 0.065, 0.012, x, top, -0.012, x, top - 0.065, -0.012);
    if (i < segX) {
      const k = i * 4;
      bandIdx.push(k, k + 1, k + 5, k, k + 5, k + 4, k + 2, k + 6, k + 7, k + 2, k + 7, k + 3);
      bandIdx.push(k, k + 4, k + 6, k, k + 6, k + 2);
    }
  }
  const bandGeometry = new BufferGeometry();
  bandGeometry.setAttribute("position", new Float32BufferAttribute(band, 3));
  bandGeometry.setIndex(bandIdx);
  bandGeometry.computeVertexNormals();
  const white = new MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.7, side: DoubleSide });
  const bandMesh = new Mesh(bandGeometry, white);
  bandMesh.castShadow = true;
  group.add(bandMesh);

  const strap = new Mesh(new BoxGeometry(0.05, COURT.netCentre, 0.02), white);
  strap.position.set(0, COURT.netCentre / 2, 0);
  strap.castShadow = true;
  group.add(strap);

  const postMaterial = new MeshStandardMaterial({
    color: 0x1f3a2c,
    roughness: 0.45,
    metalness: 0.4,
  });
  for (const sign of [-1, 1]) {
    const post = new Mesh(new CylinderGeometry(0.038, 0.038, 1.1, 12), postMaterial);
    post.position.set(sign * COURT.netPost, 0.55, 0);
    post.castShadow = true;
    group.add(post);
    const cap = new Mesh(new SphereGeometry(0.045, 12, 8), postMaterial);
    cap.position.set(sign * COURT.netPost, 1.1, 0);
    group.add(cap);
  }
  return group;
}

/**
 * Merges every mesh of a static group into one mesh per material: the umpire's chair and the
 * benches are dozens of boxes, but they cost two draw calls.
 */
function mergeStatic(group: Group): Group {
  group.updateMatrixWorld(true);
  const byMaterial = new Map<MeshStandardMaterial, BufferGeometry[]>();
  group.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const material = o.material as MeshStandardMaterial;
    const geometry = (o.geometry as BufferGeometry).clone().applyMatrix4(o.matrixWorld);
    const list = byMaterial.get(material) ?? [];
    list.push(geometry.index ? geometry.toNonIndexed() : geometry);
    byMaterial.set(material, list);
  });
  const merged = new Group();
  for (const [material, geometries] of byMaterial) {
    const geometry = mergeGeometries(geometries);
    if (!geometry) continue;
    const mesh = new Mesh(geometry, material);
    mesh.castShadow = true;
    merged.add(mesh);
  }
  return merged;
}

/** Umpire's chair beside the net post, and the players' benches opposite. */
function buildFurniture(): Group {
  const group = new Group();
  const metal = new MeshStandardMaterial({ color: 0x1f3a2c, roughness: 0.5, metalness: 0.35 });
  const wood = new MeshStandardMaterial({ color: 0xe9e3d6, roughness: 0.65 });
  const chair = new Group();
  for (const [x, z] of [
    [-0.32, -0.32],
    [0.32, -0.32],
    [-0.32, 0.32],
    [0.32, 0.32],
  ] as const) {
    const leg = new Mesh(new BoxGeometry(0.05, 1.9, 0.05), metal);
    leg.position.set(x, 0.95, z);
    leg.castShadow = true;
    chair.add(leg);
  }
  const seat = new Mesh(new BoxGeometry(0.72, 0.06, 0.72), wood);
  seat.position.y = 1.9;
  const back = new Mesh(new BoxGeometry(0.06, 0.55, 0.72), wood);
  back.position.set(-0.34, 2.2, 0);
  const rest = new Mesh(new BoxGeometry(0.5, 0.05, 0.72), metal);
  rest.position.set(0.5, 1.2, 0);
  for (const part of [seat, back, rest]) {
    part.castShadow = true;
    chair.add(part);
  }
  for (let i = 0; i < 5; i++) {
    const rung = new Mesh(new BoxGeometry(0.04, 0.04, 0.6), metal);
    rung.position.set(0.36, 0.3 + i * 0.32, 0);
    chair.add(rung);
  }
  chair.position.set(-(COURT.netPost + 1.1), 0, 0);
  group.add(chair);

  for (const z of [-1.6, 1.6]) {
    const bench = new Group();
    const top = new Mesh(new BoxGeometry(0.42, 0.05, 1.8), wood);
    top.position.y = 0.45;
    const backrest = new Mesh(new BoxGeometry(0.04, 0.35, 1.8), wood);
    backrest.position.set(0.2, 0.68, 0);
    bench.add(top, backrest);
    for (const lz of [-0.8, 0.8]) {
      const leg = new Mesh(new BoxGeometry(0.4, 0.45, 0.05), metal);
      leg.position.set(0, 0.225, lz);
      bench.add(leg);
    }
    bench.traverse((o) => {
      if (o instanceof Mesh) o.castShadow = true;
    });
    bench.position.set(COURT.netPost + 1.3, 0, z);
    group.add(bench);
  }
  return mergeStatic(group);
}

/** Fence posts, top rail and the dark green windscreens around the court. */
function buildFence(): Group {
  const group = new Group();
  const hx = COURT.surfaceHalfWidth + 0.05;
  const hz = COURT.surfaceHalfLength + 0.05;
  const height = 3.4;
  const screenHeight = 2.3;
  const screen = windscreenTexture();
  const screenMaterial = new MeshStandardMaterial({
    map: screen,
    roughness: 0.95,
    side: DoubleSide,
  });
  const meshMaterial = new MeshStandardMaterial({
    color: 0x2c3a31,
    roughness: 0.8,
    transparent: true,
    opacity: 0.35,
    side: DoubleSide,
    depthWrite: false,
  });
  const postMaterial = new MeshStandardMaterial({
    color: 0x1c2a22,
    roughness: 0.5,
    metalness: 0.4,
  });
  const sides: { length: number; position: Vector3; rotation: number }[] = [
    { length: hx * 2, position: new Vector3(0, 0, -hz), rotation: 0 },
    { length: hx * 2, position: new Vector3(0, 0, hz), rotation: Math.PI },
    { length: hz * 2, position: new Vector3(-hx, 0, 0), rotation: Math.PI / 2 },
    { length: hz * 2, position: new Vector3(hx, 0, 0), rotation: -Math.PI / 2 },
  ];
  // Every post of the four walls in one instanced draw call.
  const postMatrices: Matrix4[] = [];
  const q = new Quaternion();
  for (const side of sides) {
    const wall = new Group();
    const s = new Mesh(new PlaneGeometry(side.length, screenHeight), screenMaterial);
    s.position.y = screenHeight / 2;
    const m = new Mesh(new PlaneGeometry(side.length, height - screenHeight), meshMaterial);
    m.position.y = screenHeight + (height - screenHeight) / 2;
    s.receiveShadow = true;
    wall.add(s, m);
    const rail = new Mesh(new CylinderGeometry(0.03, 0.03, side.length, 8), postMaterial);
    rail.rotation.z = Math.PI / 2;
    rail.position.y = height;
    wall.add(rail);
    wall.position.copy(side.position);
    wall.rotation.y = side.rotation;
    wall.updateMatrixWorld(true);
    const posts = Math.round(side.length / 3);
    for (let i = 0; i <= posts; i++) {
      const local = new Vector3(-side.length / 2 + (i / posts) * side.length, height / 2, 0.03);
      postMatrices.push(
        new Matrix4().compose(local.applyMatrix4(wall.matrixWorld), q, new Vector3(1, 1, 1)),
      );
    }
    group.add(wall);
  }
  const posts = new InstancedMesh(
    new CylinderGeometry(0.035, 0.035, height, 8),
    postMaterial,
    postMatrices.length,
  );
  postMatrices.forEach((matrix, i) => posts.setMatrixAt(i, matrix));
  group.add(posts);
  return group;
}

/** A ring of trees beyond the fence, fading into the haze. */
function buildTrees(): InstancedMesh {
  const random = rng(21);
  const count = 84;
  const geometry = new IcosahedronGeometry(1, 3);
  const material = new MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  const trees = new InstancedMesh(geometry, material, count);
  const matrix = new Matrix4();
  const q = new Quaternion();
  const color = new Color();
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + random() * 0.08;
    const rx = 30 + random() * 14;
    const rz = 36 + random() * 14;
    const x = Math.cos(angle) * rx;
    const z = Math.sin(angle) * rz;
    // Mostly slender cypresses, with a few broad crowns between them.
    const cypress = random() < 0.65;
    const h = cypress ? 9 + random() * 5 : 6 + random() * 4;
    const w = cypress ? 1.1 + random() * 0.6 : 2.6 + random() * 1.6;
    matrix.compose(new Vector3(x, h * 0.5, z), q, new Vector3(w, h * 0.5, w));
    trees.setMatrixAt(i, matrix);
    trees.setColorAt(i, color.setHSL(0.2 + random() * 0.06, 0.32, 0.17 + random() * 0.08));
  }
  return trees;
}

export type CourtScene = {
  group: Group;
  textures: Texture[];
};

/** Everything static: surface, lines, net, furniture, fence, surroundings and sky. */
export function buildCourt(maxAnisotropy: number, detail: "high" | "low"): CourtScene {
  const group = new Group();
  const macro = clayMacroTexture(maxAnisotropy);
  const grain = clayGrainTexture(maxAnisotropy);
  grain.repeat.set(24, 48);
  const surface = new Mesh(
    new PlaneGeometry(COURT.surfaceHalfWidth * 2, COURT.surfaceHalfLength * 2),
    new MeshStandardMaterial({
      map: macro,
      bumpMap: grain,
      bumpScale: 1.4,
      roughnessMap: grain,
      roughness: 1,
      color: 0xffffff,
    }),
  );
  surface.rotation.x = -Math.PI / 2;
  surface.receiveShadow = true;
  group.add(surface);

  const lines = new Mesh(
    linesGeometry(courtLines()),
    new MeshStandardMaterial({
      map: lineTexture(),
      roughness: 0.85,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  lines.position.y = 0.002;
  lines.receiveShadow = true;
  group.add(lines);

  group.add(buildNet());
  group.add(buildFurniture());
  group.add(buildFence());

  const ground = new Mesh(
    new PlaneGeometry(260, 260),
    new MeshStandardMaterial({ color: 0x4a4f33, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = detail === "high";
  group.add(ground);
  group.add(buildTrees());

  const skyMap = skyTexture();
  const sky = new Mesh(
    new SphereGeometry(120, 32, 16),
    new MeshBasicMaterial({ map: skyMap, side: BackSide, fog: false, depthWrite: false }),
  );
  sky.renderOrder = -1;
  group.add(sky);

  return { group, textures: [macro, grain, skyMap] };
}
