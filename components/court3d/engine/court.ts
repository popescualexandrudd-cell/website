import {
  BackSide,
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Euler,
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
  asphaltTexture,
  chainLinkTexture,
  claddingTexture,
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

type FenceMaterials = {
  screen: MeshStandardMaterial;
  printed: MeshStandardMaterial;
  wire: MeshStandardMaterial;
  post: MeshStandardMaterial;
};

function fenceMaterials(): { materials: FenceMaterials; textures: Texture[] } {
  const plain = windscreenTexture();
  const print = windscreenTexture("ELITE TENNIS CLUB");
  const wire = chainLinkTexture();
  const screen = new MeshStandardMaterial({ map: plain, roughness: 0.95, side: DoubleSide });
  const printed = new MeshStandardMaterial({ map: print, roughness: 0.95, side: DoubleSide });
  const wireMaterial = new MeshStandardMaterial({
    map: wire,
    alphaTest: 0.35,
    roughness: 0.55,
    metalness: 0.5,
    side: DoubleSide,
  });
  const post = new MeshStandardMaterial({ color: 0x27332d, roughness: 0.45, metalness: 0.55 });
  return {
    materials: { screen, printed, wire: wireMaterial, post },
    textures: [plain, print, wire],
  };
}

/**
 * The fence of one court: galvanised chain-link from the ground to the top rail (3.6 m), dark
 * green windscreens tied on up to 2.2 m (the club's name printed on the long sides), round
 * posts every 3 m with top and middle rails, and a gate in one corner.
 */
function buildFence(
  materials: FenceMaterials,
  centreX: number,
  sides: { north: boolean; south: boolean; west: boolean; east: boolean },
): Group {
  const group = new Group();
  const hx = COURT.surfaceHalfWidth + 0.05;
  const hz = COURT.surfaceHalfLength + 0.05;
  const height = 3.6;
  const screenHeight = 2.2;
  const walls: { length: number; position: Vector3; rotation: number; printed: boolean }[] = [];
  if (sides.north)
    walls.push({
      length: hx * 2,
      position: new Vector3(centreX, 0, -hz),
      rotation: 0,
      printed: false,
    });
  if (sides.south)
    walls.push({
      length: hx * 2,
      position: new Vector3(centreX, 0, hz),
      rotation: Math.PI,
      printed: false,
    });
  if (sides.west)
    walls.push({
      length: hz * 2,
      position: new Vector3(centreX - hx, 0, 0),
      rotation: Math.PI / 2,
      printed: true,
    });
  if (sides.east)
    walls.push({
      length: hz * 2,
      position: new Vector3(centreX + hx, 0, 0),
      rotation: -Math.PI / 2,
      printed: true,
    });
  const postMatrices: Matrix4[] = [];
  const railMatrices: Matrix4[] = [];
  const q = new Quaternion();
  const one = new Vector3(1, 1, 1);
  for (const wall of walls) {
    const w = new Group();
    // Windscreen panels, 6 m each, hung 5 cm above the clay.
    const panels = Math.round(wall.length / 6);
    const panelLength = wall.length / panels;
    for (let i = 0; i < panels; i++) {
      const printed = wall.printed && i % 2 === 1;
      const panel = new Mesh(
        new PlaneGeometry(panelLength - 0.04, screenHeight - 0.05),
        printed ? materials.printed : materials.screen,
      );
      panel.position.set(-wall.length / 2 + (i + 0.5) * panelLength, 0.05 + screenHeight / 2, 0.02);
      panel.receiveShadow = true;
      w.add(panel);
    }
    // Chain-link over the whole height (seen above the screens and through the gate).
    const wireGeometry = new PlaneGeometry(wall.length, height);
    const uv = wireGeometry.getAttribute("uv");
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, uv.getX(i) * wall.length * 2, uv.getY(i) * height * 2);
    const wire = new Mesh(wireGeometry, materials.wire);
    wire.position.set(0, height / 2, 0);
    w.add(wire);
    w.position.copy(wall.position);
    w.rotation.y = wall.rotation;
    w.updateMatrixWorld(true);
    const rot = new Quaternion().setFromEuler(new Euler(0, wall.rotation, Math.PI / 2));
    for (const y of [height, 1.2]) {
      const centre = new Vector3(0, y, 0.035).applyMatrix4(w.matrixWorld);
      railMatrices.push(new Matrix4().compose(centre, rot, new Vector3(1, wall.length, 1)));
    }
    const posts = Math.round(wall.length / 3);
    for (let i = 0; i <= posts; i++) {
      const local = new Vector3(-wall.length / 2 + (i / posts) * wall.length, height / 2, 0.04);
      postMatrices.push(new Matrix4().compose(local.applyMatrix4(w.matrixWorld), q, one));
    }
    group.add(w);
  }
  const posts = new InstancedMesh(
    new CylinderGeometry(0.038, 0.038, height + 0.1, 10),
    materials.post,
    postMatrices.length,
  );
  postMatrices.forEach((matrix, i) => posts.setMatrixAt(i, matrix));
  posts.castShadow = true;
  const rails = new InstancedMesh(
    new CylinderGeometry(0.022, 0.022, 1, 8),
    materials.post,
    railMatrices.length,
  );
  railMatrices.forEach((matrix, i) => rails.setMatrixAt(i, matrix));
  group.add(posts, rails);
  return group;
}

/** Floodlight masts at the corners: 9 m poles with two LED heads aimed at the court. */
function buildLights(): Group {
  const group = new Group();
  const metal = new MeshStandardMaterial({ color: 0x8d9391, roughness: 0.45, metalness: 0.7 });
  const housing = new MeshStandardMaterial({ color: 0x2c3032, roughness: 0.5, metalness: 0.4 });
  const lens = new MeshStandardMaterial({
    color: 0xe9eef2,
    roughness: 0.2,
    emissive: 0x9aa4ab,
    emissiveIntensity: 0.15,
  });
  const hx = COURT.surfaceHalfWidth + 0.6;
  const hz = COURT.surfaceHalfLength - 4;
  for (const [x, z] of [
    [-hx, -hz],
    [hx, -hz],
    [-hx, hz],
    [hx, hz],
    [-hx, 0],
    [hx, 0],
  ] as const) {
    const mast = new Group();
    const pole = new Mesh(new CylinderGeometry(0.07, 0.11, 9, 10), metal);
    pole.position.y = 4.5;
    mast.add(pole);
    const arm = new Mesh(new BoxGeometry(0.9, 0.08, 0.08), metal);
    arm.position.set(0, 8.9, 0);
    mast.add(arm);
    for (const dx of [-0.35, 0.35]) {
      const head = new Group();
      const box = new Mesh(new BoxGeometry(0.5, 0.36, 0.1), housing);
      const face = new Mesh(new BoxGeometry(0.44, 0.3, 0.02), lens);
      face.position.z = 0.055;
      head.add(box, face);
      head.position.set(dx, 8.7, 0.12);
      head.rotation.x = 0.55;
      mast.add(head);
    }
    mast.position.set(x, 0, z);
    // Heads face the court centre.
    mast.rotation.y = Math.atan2(-x, -z);
    group.add(mast);
  }
  return mergeStatic(group);
}

/** The coach's things by the court: a ball basket, the drag brush on the fence, a scoreboard. */
function buildDetails(): Group {
  const group = new Group();
  const wire = new MeshStandardMaterial({ color: 0x30343a, roughness: 0.5, metalness: 0.6 });
  const felt = new MeshStandardMaterial({ color: 0xd8e25a, roughness: 0.95 });
  // Ball basket beside the near baseline, full of balls.
  const basket = new Group();
  const cage = new Mesh(new CylinderGeometry(0.2, 0.18, 0.5, 16, 4, true), wire);
  cage.position.y = 0.55;
  const cageMaterial = cage.material as MeshStandardMaterial;
  cageMaterial.wireframe = true;
  basket.add(cage);
  for (const [lx, lz] of [
    [0.18, 0.18],
    [-0.18, 0.18],
    [0.18, -0.18],
    [-0.18, -0.18],
  ] as const) {
    const leg = new Mesh(new CylinderGeometry(0.012, 0.012, 0.8, 6), wire);
    leg.position.set(lx, 0.4, lz);
    leg.rotation.set(lz > 0 ? -0.12 : 0.12, 0, lx > 0 ? 0.12 : -0.12);
    basket.add(leg);
  }
  const random = rng(31);
  const ballGeometry = new SphereGeometry(0.034, 10, 8);
  for (let i = 0; i < 26; i++) {
    const a = random() * Math.PI * 2;
    const r = Math.sqrt(random()) * 0.15;
    const ball = new Mesh(ballGeometry, felt);
    ball.position.set(Math.cos(a) * r, 0.5 + random() * 0.26, Math.sin(a) * r);
    basket.add(ball);
  }
  basket.position.set(COURT.halfDoubles + 1.4, 0, COURT.halfLength - 1.2);
  group.add(basket);

  // Drag brush leaning on the fence behind the far baseline.
  const broom = new MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.95 });
  const brush = new Mesh(new BoxGeometry(1.8, 0.35, 0.05), broom);
  brush.position.set(-3.5, 0.3, -COURT.surfaceHalfLength + 0.25);
  brush.rotation.x = -0.25;
  const handle = new Mesh(new CylinderGeometry(0.015, 0.015, 1.7, 6), broom);
  handle.position.set(-3.5, 0.95, -COURT.surfaceHalfLength + 0.4);
  handle.rotation.x = -0.35;
  group.add(brush, handle);

  // Flip-card scoreboard on the fence beside the net.
  const board = new Mesh(
    new BoxGeometry(0.9, 0.5, 0.05),
    new MeshStandardMaterial({ color: 0x1d2a22, roughness: 0.6 }),
  );
  board.position.set(-COURT.surfaceHalfWidth + 0.12, 1.5, 0.9);
  board.rotation.y = Math.PI / 2;
  group.add(board);
  const white = new MeshStandardMaterial({ color: 0xefece4, roughness: 0.7 });
  for (let i = 0; i < 4; i++) {
    const card = new Mesh(new BoxGeometry(0.16, 0.24, 0.01), white);
    card.position.set(-COURT.surfaceHalfWidth + 0.155, 1.5, 0.9 - 0.33 + i * 0.22);
    card.rotation.y = Math.PI / 2;
    group.add(card);
  }
  group.traverse((o) => {
    if (o instanceof Mesh) o.castShadow = true;
  });
  return mergeStatic(group);
}

/**
 * The covered courts' hall in the distance: a steel-clad hall with a barrel roof and a band of
 * translucent panels under the eaves.
 */
function buildHall(cladding: Texture): Group {
  const group = new Group();
  const walls = new MeshStandardMaterial({ map: cladding, roughness: 0.55, metalness: 0.35 });
  const roof = new MeshStandardMaterial({ color: 0xb9bec0, roughness: 0.5, metalness: 0.4 });
  const glazing = new MeshStandardMaterial({ color: 0xdfe6e8, roughness: 0.25, metalness: 0.1 });
  const w = 36;
  const d = 40;
  const h = 6.5;
  const map = cladding.clone();
  map.repeat.set(w / 2, 1);
  map.needsUpdate = true;
  for (const [x, z, length, rot] of [
    [0, -d / 2, w, 0],
    [0, d / 2, w, Math.PI],
    [-w / 2, 0, d, Math.PI / 2],
    [w / 2, 0, d, -Math.PI / 2],
  ] as const) {
    const wall = new Mesh(new PlaneGeometry(length, h), walls);
    wall.position.set(x, h / 2, z);
    wall.rotation.y = rot;
    group.add(wall);
    const band = new Mesh(new PlaneGeometry(length, 0.9), glazing);
    band.position.set(x, h - 0.6, z);
    band.rotation.y = rot;
    band.translateZ(0.02);
    group.add(band);
  }
  const vault = new Mesh(
    new CylinderGeometry(w / 2 / Math.sin(1.1), w / 2 / Math.sin(1.1), d, 40, 1, true, -1.1, 2.2),
    roof,
  );
  vault.rotation.x = Math.PI / 2;
  vault.rotation.z = 0;
  const radius = w / 2 / Math.sin(1.1);
  vault.position.y = h - radius * Math.cos(1.1);
  group.add(vault);
  group.traverse((o) => {
    if (o instanceof Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return group;
}

/** A ring of trees beyond the fence, fading into the haze (painted-sky fallback only). */
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

/**
 * Everything static: our court (surface, lines, net, furniture, fence, floodlights, the coach's
 * things) and the club around it: the neighbouring clay courts, the paths between them and,
 * further away, the hall of the covered courts. With the photographed surroundings the field
 * and trees come from the photograph; without it, a painted sky and a ring of trees.
 */
export function buildCourt(
  maxAnisotropy: number,
  detail: "high" | "low",
  photographed = false,
): CourtScene {
  const group = new Group();
  const macro = clayMacroTexture(maxAnisotropy);
  const grain = clayGrainTexture(maxAnisotropy);
  grain.repeat.set(24, 48);
  const clay = new MeshStandardMaterial({
    map: macro,
    bumpMap: grain,
    bumpScale: 1.4,
    roughnessMap: grain,
    roughness: 1,
    color: 0xffffff,
  });
  const lineMaterial = new MeshStandardMaterial({
    map: lineTexture(),
    roughness: 0.85,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const courtWidth = COURT.surfaceHalfWidth * 2 + 0.1;
  const neighbours = detail === "high" ? [-1, 1] : [];
  for (const offset of [0, ...neighbours]) {
    const x = offset * courtWidth;
    const surface = new Mesh(
      new PlaneGeometry(COURT.surfaceHalfWidth * 2, COURT.surfaceHalfLength * 2),
      clay,
    );
    surface.rotation.x = -Math.PI / 2;
    surface.position.x = x;
    surface.receiveShadow = true;
    group.add(surface);
    const lines = new Mesh(linesGeometry(courtLines()), lineMaterial);
    lines.position.set(x, 0.002, 0);
    lines.receiveShadow = true;
    group.add(lines);
    if (offset !== 0) {
      const net = buildNet();
      net.position.x = x;
      group.add(net);
    }
  }
  group.add(buildNet());
  group.add(buildFurniture());
  group.add(buildDetails());

  const fence = fenceMaterials();
  group.add(buildFence(fence.materials, 0, { north: true, south: true, west: true, east: true }));
  for (const offset of neighbours) {
    group.add(
      buildFence(fence.materials, offset * courtWidth, {
        north: true,
        south: true,
        west: offset < 0,
        east: offset > 0,
      }),
    );
  }
  group.add(buildLights());

  const textures: Texture[] = [macro, grain, ...fence.textures];
  if (photographed) {
    // Asphalt paths around the courts, ending in the photographed field.
    const asphalt = asphaltTexture(maxAnisotropy);
    const span = courtWidth * (1 + neighbours.length) + 8;
    const depth = COURT.surfaceHalfLength * 2 + 8;
    asphalt.repeat.set(span / 4, depth / 4);
    const path = new Mesh(
      new PlaneGeometry(span, depth),
      new MeshStandardMaterial({ map: asphalt, roughness: 0.95 }),
    );
    path.rotation.x = -Math.PI / 2;
    path.position.y = -0.004;
    path.receiveShadow = true;
    group.add(path);
    textures.push(asphalt);
    if (detail === "high") {
      const cladding = claddingTexture();
      const hall = buildHall(cladding);
      hall.position.set(courtWidth * 0.5, 0, -COURT.surfaceHalfLength - 34);
      group.add(hall);
      textures.push(cladding);
    }
  } else {
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
    textures.push(skyMap);
  }
  return { group, textures };
}
