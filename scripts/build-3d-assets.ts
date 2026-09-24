/**
 * Builds the 3D assets of the court scene from CC0 sources:
 *
 *  - the player: the MakeHuman base mesh (hm08) morphed with MakeHuman's own targets into a
 *    young, athletic man, scaled to the rig of components/court3d/engine/player.ts, fingers
 *    closed around the racket handle, dressed (shirt, shorts, socks, shoes, hair), with eyes and
 *    skinning weights for the rig's bones → public/3d/jucator-v1.bin and the rig constants in
 *    components/court3d/engine/humanRig.ts;
 *  - the surroundings: the "Spruit sunrise" HDRI by Greg Zaal (Poly Haven, CC0): its 4K
 *    photograph (the base image of the three.js example's gain-map JPEG) for the sky and the
 *    field around the club → public/3d/cer-4k-v1.jpg (desktop) and cer-v1.jpg (phones, light);
 *    the HDR version only tells where the sun is.
 *
 * Run it only to change the assets (the outputs are committed): npm run assets:3d
 * Sources are cached in .cache/3d-sources/.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const CACHE = join(ROOT, ".cache", "3d-sources");
const MH = "https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data";
const EQUIRECT =
  "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/equirectangular";
const HDRI = `${EQUIRECT}/spruit_sunrise_1k.hdr`;
const PHOTO = `${EQUIRECT}/spruit_sunrise_4k.hdr.jpg`;

type V3 = [number, number, number];

// ─── Small vector helpers ────────────────────────────────────────────────────

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V3): V3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const lerp3 = (a: V3, b: V3, t: number): V3 => add(a, mul(sub(b, a), t));
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
/** Rodrigues rotation of v about a unit axis through a pivot. */
function rotateAbout(v: V3, pivot: V3, axis: V3, angle: number): V3 {
  const p = sub(v, pivot);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const r = add(add(mul(p, c), mul(cross(axis, p), s)), mul(axis, dot(axis, p) * (1 - c)));
  return add(r, pivot);
}
/** Distance from p to segment ab, and the parameter along it (0 at a, 1 at b). */
function segment(p: V3, a: V3, b: V3): { d: number; t: number } {
  const ab = sub(b, a);
  const t = Math.min(1, Math.max(0, dot(sub(p, a), ab) / (dot(ab, ab) || 1)));
  return { d: len(sub(p, add(a, mul(ab, t)))), t };
}
const round = (v: number, digits = 5) => Number(v.toFixed(digits));
const r3 = (v: V3): V3 => [round(v[0]), round(v[1]), round(v[2])];

// ─── Sources ─────────────────────────────────────────────────────────────────

async function fetchCached(url: string, name: string): Promise<Buffer> {
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, name);
  if (existsSync(file)) return readFileSync(file);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(file, buffer);
  return buffer;
}

type Obj = { vertices: V3[]; groups: Map<string, number[][]> };

function parseObj(text: string): Obj {
  const vertices: V3[] = [];
  const groups = new Map<string, number[][]>();
  let current = "default";
  for (const line of text.split("\n")) {
    if (line.startsWith("v ")) {
      const [, x, y, z] = line.trim().split(/\s+/);
      vertices.push([Number(x), Number(y), Number(z)]);
    } else if (line.startsWith("g ")) {
      current = line.slice(2).trim();
    } else if (line.startsWith("f ")) {
      const face = line
        .trim()
        .split(/\s+/)
        .slice(1)
        .map((token) => Number(token.split("/")[0]) - 1);
      const list = groups.get(current) ?? [];
      list.push(face);
      groups.set(current, list);
    }
  }
  return { vertices, groups };
}

function applyTarget(vertices: V3[], text: string, weight: number): void {
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const [i, dx, dy, dz] = line.trim().split(/\s+/).map(Number);
    const v = vertices[i ?? -1];
    if (!v || dx === undefined || dy === undefined || dz === undefined) continue;
    v[0] += dx * weight;
    v[1] += dy * weight;
    v[2] += dz * weight;
  }
}

// ─── The player ──────────────────────────────────────────────────────────────

/** The rig's fixed choices (see player.ts): hip joints 7 cm below the pelvis centre, chest 8 cm above. */
const HIP_DROP = 0.07;
const SPINE_UP = 0.08;
/** The strokes were written for an athlete of about 1.83 m. */
const TARGET_HEIGHT = 1.82;

const BONES = [
  "pelvis",
  "spine",
  "chest",
  "neck",
  "head",
  "lUpperArm",
  "lForearm",
  "lHand",
  "rUpperArm",
  "rForearm",
  "rHand",
  "lThigh",
  "lShin",
  "lFoot",
  "rThigh",
  "rShin",
  "rFoot",
] as const;
type Bone = (typeof BONES)[number];
const boneIndex = (name: Bone) => BONES.indexOf(name);

const MATERIALS = ["skin", "shirt", "shorts", "socks", "shoes", "hair", "eyes"] as const;
type MaterialName = (typeof MATERIALS)[number];
/** How far each garment stands off the skin, in metres. */
const INFLATE: Record<MaterialName, number> = {
  skin: 0,
  shirt: 0.02,
  shorts: 0.02,
  socks: 0.002,
  shoes: 0.013,
  hair: 0.005,
  eyes: 0,
};

async function buildPlayer() {
  const obj = parseObj((await fetchCached(`${MH}/3dobjs/base.obj`, "base.obj")).toString());
  // MakeHuman macro settings: male, young, caucasian, athletic (more muscle, a little less fat),
  // ideal proportions, slightly taller than average.
  const targets: [string, number][] = [
    ["macrodetails/caucasian-male-young.target", 1],
    ["macrodetails/universal-male-young-maxmuscle-averageweight.target", 0.45],
    ["macrodetails/universal-male-young-averagemuscle-minweight.target", 0.25],
    [
      "macrodetails/proportions/male-young-averagemuscle-averageweight-idealproportions.target",
      0.5,
    ],
    ["macrodetails/height/male-young-averagemuscle-averageweight-maxheight.target", 0.25],
  ];
  const vertices = obj.vertices.map((v) => [...v] as V3);
  for (const [path, weight] of targets) {
    const text = (
      await fetchCached(`${MH}/targets/${path}`, path.replaceAll("/", "__"))
    ).toString();
    applyTarget(vertices, text, weight);
  }

  const joint = (name: string): V3 => {
    const faces = obj.groups.get(`joint-${name}`);
    if (!faces) throw new Error(`joint-${name} missing`);
    const ids = [...new Set(faces.flat())];
    return mul(
      ids.reduce<V3>((acc, i) => add(acc, vertices[i] ?? [0, 0, 0]), [0, 0, 0]),
      1 / ids.length,
    );
  };

  // Scale to a real player's height; turn to face -z (right hand at +x); feet on the ground.
  const bodyIds = [...new Set((obj.groups.get("body") ?? []).flat())];
  const top = Math.max(...bodyIds.map((i) => vertices[i]?.[1] ?? -Infinity));
  const scale = TARGET_HEIGHT / (top - joint("ground")[1]);
  const ground = joint("ground")[1];
  const place = (v: V3): V3 => [-v[0] * scale, (v[1] - ground) * scale, -v[2] * scale];
  const J = (name: string) => place(joint(name));

  // ── Mesh: body + eyes, quads split into triangles, compact vertex list ──
  const partFaces: { faces: number[][]; eye: boolean }[] = [
    { faces: obj.groups.get("body") ?? [], eye: false },
    { faces: obj.groups.get("helper-l-eye") ?? [], eye: true },
    { faces: obj.groups.get("helper-r-eye") ?? [], eye: true },
  ];
  const remap = new Map<number, number>();
  const pos: V3[] = [];
  const isEye: boolean[] = [];
  const tris: number[][] = [];
  /** The original (quad) face of each triangle: garments are cut along whole quads. */
  const triFace: number[] = [];
  let faceCount = 0;
  for (const part of partFaces) {
    for (const face of part.faces) {
      const faceId = faceCount++;
      const local = face.map((i) => {
        let j = remap.get(i);
        if (j === undefined) {
          j = pos.length;
          remap.set(i, j);
          pos.push(place(vertices[i] ?? [0, 0, 0]));
          isEye.push(part.eye);
        }
        return j;
      });
      for (let k = 1; k + 1 < local.length; k++) {
        tris.push([local[0]!, local[k]!, local[k + 1]!]);
        triFace.push(faceId);
      }
    }
  }
  const neighbours: Set<number>[] = pos.map(() => new Set());
  for (const [a, b, c] of tris as [number, number, number][]) {
    neighbours[a]!.add(b).add(c);
    neighbours[b]!.add(a).add(c);
    neighbours[c]!.add(a).add(b);
  }

  // ── Joints (rig space) ──
  const side = (s: "l" | "r") => {
    const finger = (k: number) => [1, 2, 3, 4].map((j) => J(`${s}-finger-${k}-${j}`));
    return {
      hip: J(`${s}-upper-leg`),
      knee: J(`${s}-knee`),
      ankle: J(`${s}-ankle`),
      toe: lerp3(J(`${s}-foot-1`), J(`${s}-foot-2`), 0.5),
      toeTip: J(`${s}-foot-2`),
      shoulder: J(`${s}-shoulder`),
      elbow: J(`${s}-elbow`),
      wrist: J(`${s}-hand`),
      fingers: [1, 2, 3, 4, 5].map(finger),
    };
  };
  const L = side("l");
  const R = side("r");
  const hipsMid = lerp3(L.hip, R.hip, 0.5);
  const pelvis: V3 = [0, hipsMid[1] + HIP_DROP, hipsMid[2]];
  const chestOrigin: V3 = [0, pelvis[1] + SPINE_UP, pelvis[2]];
  const spine2 = J("spine-2");
  const neck = J("neck");
  const head = J("head");
  const headTop = J("head-2");
  const eyeL = J("l-eye");
  const eyeR = J("r-eye");
  const mouth = J("mouth");

  // ── Fingers closed on the handle (right) and relaxed (left), before anything else ──
  const handVerts = (s: "l" | "r") => {
    const S = s === "l" ? L : R;
    const out: number[] = [];
    for (let i = 0; i < pos.length; i++) {
      if (isEye[i]) continue;
      const p = pos[i]!;
      const toWrist = segment(p, S.elbow, S.wrist);
      // Beyond the wrist, along the forearm's line, and on this side of the body.
      if (Math.sign(p[0]) !== Math.sign(S.wrist[0])) continue;
      if (toWrist.t < 0.999) continue;
      if (len(sub(p, S.wrist)) > 0.25) continue;
      out.push(i);
    }
    return out;
  };
  const palmNormal = (s: "l" | "r") => {
    const S = s === "l" ? L : R;
    const a = sub(S.fingers[1]![0]!, S.wrist);
    const b = sub(S.fingers[4]![0]!, S.wrist);
    let n = norm(cross(a, b));
    // The palm is the side the thumb tip bends towards.
    if (dot(n, sub(S.fingers[0]![3]!, S.wrist)) < 0) n = mul(n, -1);
    return n;
  };
  const curl = (s: "l" | "r", angles: { finger: number[]; thumb: number[] }) => {
    const S = s === "l" ? L : R;
    const n = palmNormal(s);
    const ids = handVerts(s);
    const DEG = Math.PI / 180;
    const moved = ids.map((i) => pos[i]!);
    // Each vertex follows the finger it is closest to, joint by joint (distal joints first).
    const chains = S.fingers.map((points, k) => {
      const tip = add(points[3]!, mul(norm(sub(points[3]!, points[2]!)), 0.012));
      const chain = [...points, tip];
      const dir = norm(sub(chain[chain.length - 1]!, chain[0]!));
      const axis = norm(cross(dir, n));
      const deg = k === 0 ? angles.thumb : angles.finger.map((a) => a * (k === 1 ? 0.85 : 1));
      return { chain, axis, deg };
    });
    const result = moved.map((p) => {
      let best = { k: -1, d: Infinity, s: 0 };
      for (const [k, { chain }] of chains.entries()) {
        let acc = 0;
        for (let j = 0; j + 1 < chain.length; j++) {
          const seg = segment(p, chain[j]!, chain[j + 1]!);
          const segLen = len(sub(chain[j + 1]!, chain[j]!));
          // Behind the first joint: only when close (the palm stays put).
          const behind =
            j === 0 && seg.t === 0 ? dot(sub(p, chain[0]!), sub(chain[1]!, chain[0]!)) / segLen : 0;
          if (seg.d < best.d) best = { k, d: seg.d, s: acc + seg.t * segLen + behind };
          acc += segLen;
        }
      }
      if (best.k < 0 || best.d > 0.022) return p;
      const { chain, axis, deg } = chains[best.k]!;
      let q = p;
      const starts: number[] = [];
      let acc = 0;
      for (let j = 0; j < chain.length - 1; j++) {
        starts.push(acc);
        acc += len(sub(chain[j + 1]!, chain[j]!));
      }
      // Thumb joints: CMC, MCP, IP; fingers: MCP, PIP, DIP.
      for (let j = Math.min(deg.length, 3) - 1; j >= 0; j--) {
        const w = smoothstep(starts[j]! - 0.006, starts[j]! + 0.009, best.s);
        if (w <= 0) continue;
        q = rotateAbout(q, chain[j]!, axis, (deg[j] ?? 0) * DEG * w);
      }
      return q;
    });
    ids.forEach((i, j) => (pos[i] = result[j]!));
    return { n };
  };
  const rightCurl = curl("r", { finger: [62, 88, 48], thumb: [22, 34, 30] });
  const leftCurl = curl("l", { finger: [22, 32, 20], thumb: [8, 14, 14] });

  /**
   * The racket frame of a hand at rest: its origin is the centre of the handle inside the fist,
   * +y runs along the handle towards the racket head (across the palm, from the heel of the
   * hand past the index knuckle), +z is the palm's normal (the face the palm pushes).
   */
  const gripFrame = (s: "l" | "r", n: V3) => {
    const S = s === "l" ? L : R;
    const index = S.fingers[1]![0]!;
    const pinky = S.fingers[4]![0]!;
    const middle = S.fingers[2]![0]!;
    const heel = lerp3(S.wrist, pinky, 0.35);
    let y = sub(index, heel);
    y = norm(sub(y, mul(n, dot(y, n))));
    const z = n;
    const x = norm(cross(y, z));
    const knuckles = mul(add(add(index, middle), add(S.fingers[3]![0]!, pinky)), 0.25);
    // The handle sits a finger's thickness in front of the palm, just behind the knuckles.
    const origin = add(lerp3(S.wrist, knuckles, 0.72), mul(n, 0.024));
    return { origin, x, y: cross(z, x), z };
  };
  const gripR = gripFrame("r", rightCurl.n);
  const gripL = gripFrame("l", leftCurl.n);

  // ── Bone segments for the weights (rest, rig space) ──
  type Seg = { bone: Bone; a: V3; b: V3; r: number };
  const handTip = (S: typeof L) => S.fingers[2]![3]!;
  const segs: Seg[] = [
    { bone: "pelvis", a: hipsMid, b: chestOrigin, r: 0.13 },
    { bone: "spine", a: chestOrigin, b: spine2, r: 0.13 },
    { bone: "chest", a: spine2, b: neck, r: 0.15 },
    { bone: "neck", a: neck, b: head, r: 0.055 },
    { bone: "head", a: head, b: headTop, r: 0.1 },
  ];
  for (const [s, S] of [
    ["l", L],
    ["r", R],
  ] as const) {
    segs.push(
      { bone: `${s}UpperArm`, a: S.shoulder, b: S.elbow, r: 0.052 },
      { bone: `${s}Forearm`, a: S.elbow, b: S.wrist, r: 0.042 },
      { bone: `${s}Hand`, a: S.wrist, b: handTip(S), r: 0.045 },
      { bone: `${s}Thigh`, a: S.hip, b: S.knee, r: 0.08 },
      { bone: `${s}Shin`, a: S.knee, b: S.ankle, r: 0.055 },
      { bone: `${s}Foot`, a: S.ankle, b: S.toeTip, r: 0.045 },
    );
  }
  const V = pos.length;
  const weights: Float32Array[] = pos.map(() => new Float32Array(BONES.length));
  const along: number[] = new Array(V).fill(0);
  const primary: Bone[] = new Array(V).fill("chest");
  for (let i = 0; i < V; i++) {
    const p = pos[i]!;
    if (isEye[i]) {
      weights[i]![boneIndex("head")] = 1;
      primary[i] = "head";
      continue;
    }
    let best = { bone: "chest" as Bone, score: Infinity, t: 0 };
    for (const s of segs) {
      // Limbs belong to their own side of the body.
      const lateral = s.bone.startsWith("l") ? -1 : s.bone.startsWith("r") ? 1 : 0;
      if (lateral !== 0 && Math.sign(p[0]) !== lateral && Math.abs(p[0]) > 0.01) continue;
      const { d, t } = segment(p, s.a, s.b);
      const score = d / s.r;
      if (score < best.score) best = { bone: s.bone, score, t };
    }
    // The hand keeps the (bent) fingers even far from its segment.
    weights[i]![boneIndex(best.bone)] = 1;
    primary[i] = best.bone;
    along[i] = best.t;
  }
  // Smooth the weights over the surface, so joints bend without creases.
  const handBones = new Set([boneIndex("lHand"), boneIndex("rHand"), boneIndex("head")]);
  for (let iteration = 0; iteration < 14; iteration++) {
    const next = weights.map((w) => w.slice());
    for (let i = 0; i < V; i++) {
      if (isEye[i]) continue;
      const nb = [...neighbours[i]!];
      if (nb.length === 0) continue;
      const mean = new Float32Array(BONES.length);
      for (const j of nb)
        for (let b = 0; b < BONES.length; b++) mean[b]! += weights[j]![b]! / nb.length;
      const w = next[i]!;
      for (let b = 0; b < BONES.length; b++) w[b] = 0.5 * weights[i]![b]! + 0.5 * mean[b]!;
    }
    for (let i = 0; i < V; i++) weights[i] = next[i]!;
  }
  // The skull and the fingers stay rigid.
  for (let i = 0; i < V; i++) {
    const b = boneIndex(primary[i]!);
    if (
      handBones.has(b) &&
      (primary[i] === "head" ? pos[i]![1] > neck[1] + 0.08 : along[i]! > 0.25)
    ) {
      weights[i]!.fill(0);
      weights[i]![b] = 1;
    }
  }

  // ── Garments, hair and skin by region ──
  // Each hem is a plane (or a gentle surface) across a limb or the body; faces are assigned by
  // their centre, then the vertices along each hem are moved onto it, so the edges are clean.
  const eyeY = (eyeL[1] + eyeR[1]) / 2;
  const waist = hipsMid[1] + 0.1;
  const sleeve = (S: typeof L) => ({
    at: S.shoulder,
    axis: norm(sub(S.elbow, S.shoulder)),
    d: 0.42 * len(sub(S.elbow, S.shoulder)),
  });
  const legHem = (S: typeof L) => ({
    at: S.hip,
    axis: norm(sub(S.knee, S.hip)),
    d: 0.4 * len(sub(S.knee, S.hip)),
  });
  const collar = (p: V3) =>
    neck[1] - 0.03 - 0.018 * Math.min(1, Math.max(0, (neck[2] - p[2]) / 0.09));
  const sockTop = (S: typeof L) => S.ankle[1] + 0.07;
  const shoeTop = (S: typeof L, p: V3) =>
    // A little higher at the heel than over the instep.
    S.ankle[1] + 0.012 + 0.018 * Math.min(1, Math.max(0, (p[2] - S.ankle[2]) / 0.05));
  const sideOf = (bone: Bone) => (bone.startsWith("l") ? L : R);
  const classify = (p: V3, bone: Bone): MaterialName => {
    if (bone === "lFoot" || bone === "rFoot" || bone === "lShin" || bone === "rShin") {
      const S = sideOf(bone);
      if (p[1] < shoeTop(S, p)) return "shoes";
      if (p[1] < sockTop(S)) return "socks";
      return "skin";
    }
    if (bone === "lThigh" || bone === "rThigh") {
      const h = legHem(sideOf(bone));
      return dot(sub(p, h.at), h.axis) < h.d ? "shorts" : "skin";
    }
    if (bone === "lUpperArm" || bone === "rUpperArm") {
      const h = sleeve(sideOf(bone));
      return dot(sub(p, h.at), h.axis) < h.d ? "shirt" : "skin";
    }
    if (bone === "pelvis" || bone === "spine") return p[1] < waist ? "shorts" : "shirt";
    if (bone === "chest") return p[1] > collar(p) ? "skin" : "shirt";
    if (bone === "head" || bone === "neck") {
      const behindEyes = p[2] > eyeL[2] + 0.035;
      if (p[1] > eyeY + 0.048) return "hair";
      // Temples and above the ears.
      if (Math.abs(p[0]) > 0.052 && behindEyes && p[1] > eyeY + 0.012) return "hair";
      // The back of the head, down to the nape.
      if (p[2] > head[2] + 0.005 && p[1] > neck[1] + 0.075) return "hair";
    }
    return "skin";
  };
  const faceMaterial = new Map<number, MaterialName>();
  const faceTris = new Map<number, number[]>();
  tris.forEach((_, t) => {
    const f = triFace[t]!;
    const list = faceTris.get(f) ?? [];
    list.push(t);
    faceTris.set(f, list);
  });
  for (const [f, list] of faceTris) {
    const ids = [...new Set(list.flatMap((t) => tris[t]!))];
    if (ids.some((i) => isEye[i])) {
      faceMaterial.set(f, "eyes");
      continue;
    }
    const centre = mul(
      ids.reduce<V3>((acc, i) => add(acc, pos[i]!), [0, 0, 0]),
      1 / ids.length,
    );
    const votes = new Map<Bone, number>();
    for (const i of ids) votes.set(primary[i]!, (votes.get(primary[i]!) ?? 0) + 1);
    const bone = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]![0];
    faceMaterial.set(f, classify(centre, bone));
  }
  const triMaterial = tris.map((_, t) => faceMaterial.get(triFace[t]!) ?? "skin");

  // Move the vertices along each hem onto it.
  const around: Set<MaterialName>[] = pos.map(() => new Set());
  tris.forEach((tri, t) => tri.forEach((i) => around[i]!.add(triMaterial[t]!)));
  const onPlane = (p: V3, h: { at: V3; axis: V3; d: number }): V3 =>
    sub(p, mul(h.axis, dot(sub(p, h.at), h.axis) - h.d));
  for (let i = 0; i < pos.length; i++) {
    const m = around[i]!;
    if (m.size !== 2 || isEye[i]) continue;
    const p = pos[i]!;
    const bone = primary[i]!;
    const has = (a: MaterialName, b: MaterialName) => m.has(a) && m.has(b);
    if (has("skin", "shirt")) {
      if (bone === "lUpperArm" || bone === "rUpperArm") pos[i] = onPlane(p, sleeve(sideOf(bone)));
      else if (bone === "chest" || bone === "neck") pos[i] = [p[0], collar(p), p[2]];
    } else if (has("skin", "shorts") && (bone === "lThigh" || bone === "rThigh")) {
      pos[i] = onPlane(p, legHem(sideOf(bone)));
    } else if (has("shirt", "shorts")) {
      pos[i] = [p[0], waist, p[2]];
    } else if (has("skin", "socks") && bone !== "pelvis") {
      pos[i] = [p[0], sockTop(p[0] < 0 ? L : R), p[2]];
    } else if (has("socks", "shoes") || has("skin", "shoes")) {
      pos[i] = [p[0], shoeTop(p[0] < 0 ? L : R, p), p[2]];
    }
  }

  // Shoes: built as trainers around each foot (the bare foot inside is dropped). Their
  // footprint and height follow the foot, widened and rounded, with a flat sole.
  type Shoe = { positions: V3[]; colors: V3[]; triangles: number[]; bone: Bone };
  const shoes: Shoe[] = [];
  const shoeVerts = new Set<number>();
  tris.forEach((tri, t) => {
    if (triMaterial[t] === "shoes") tri.forEach((i) => shoeVerts.add(i));
  });
  for (const [bone, S] of [
    ["lFoot", L],
    ["rFoot", R],
  ] as const) {
    const ids = [...shoeVerts].filter((i) => Math.sign(pos[i]![0]) === Math.sign(S.ankle[0]));
    const forward = norm([S.toeTip[0] - S.ankle[0], 0, S.toeTip[2] - S.ankle[2]]);
    const lateral: V3 = [-forward[2], 0, forward[0]];
    const base: V3 = [S.ankle[0], 0, S.ankle[2]];
    const coords = ids.map((i) => {
      const d = sub(pos[i]!, base);
      return { u: dot(d, forward), v: dot(d, lateral), w: pos[i]![1] };
    });
    const uMin = Math.min(...coords.map((c) => c.u)) - 0.012;
    const uMax = Math.max(...coords.map((c) => c.u)) + 0.014;
    const N = 30;
    const M = 28;
    const raw = Array.from({ length: N }, (_, k) => {
      const u = uMin + (k / (N - 1)) * (uMax - uMin);
      const near = coords.filter((c) => Math.abs(c.u - u) < 0.025);
      const vs = near.map((c) => c.v);
      const lo = vs.length ? Math.min(...vs) : -0.03;
      const hi = vs.length ? Math.max(...vs) : 0.03;
      return { u, centre: (lo + hi) / 2, half: (hi - lo) / 2 };
    });
    // Widths follow the foot (smoothed); heights follow a trainer's side profile: a high heel
    // counter, the collar dipping over the instep, a low rounded toe box.
    const smoothed = (key: "centre" | "half") =>
      raw.map((_, k) => {
        let sum = 0;
        let n = 0;
        for (let j = Math.max(0, k - 4); j <= Math.min(N - 1, k + 4); j++) {
          sum += raw[j]![key];
          n += 1;
        }
        return sum / n;
      });
    const centres = smoothed("centre");
    const halves = smoothed("half");
    const collarHeight = S.ankle[1] + 0.028;
    const positions: V3[] = [];
    const colors: V3[] = [];
    const triangles: number[] = [];
    for (let k = 0; k < N; k++) {
      const t = k / (N - 1);
      const u = uMin + t * (uMax - uMin);
      // Rounded heel and toe: the outline narrows and lowers at both ends.
      const heelRound = Math.sqrt(Math.max(0, 1 - Math.max(0, (0.12 - t) / 0.12) ** 2));
      const toeRound = Math.sqrt(Math.max(0, 1 - Math.max(0, (t - 0.8) / 0.2) ** 2));
      const end = Math.min(heelRound, toeRound);
      const half = Math.max(0.035, halves[k]! + 0.012) * (0.22 + 0.78 * end);
      const side =
        t < 0.38
          ? collarHeight
          : t < 0.78
            ? collarHeight + (0.058 - collarHeight) * smoothstep(0.38, 0.78, t)
            : 0.058 - 0.012 * smoothstep(0.78, 1, t);
      const height = Math.max(0.016, side * (0.4 + 0.6 * end));
      for (let j = 0; j < M; j++) {
        const a = (j / M) * Math.PI * 2;
        const c = Math.cos(a);
        const sn = Math.sin(a);
        // A superellipse: upright sides, a flat sole.
        const v = centres[k]! + half * Math.sign(c) * Math.abs(c) ** 0.55;
        let w = height / 2 + (height / 2) * Math.sign(sn) * Math.abs(sn) ** 0.7;
        if (sn < -0.35) w = 0;
        // The first and last rings close to a point: the heel and the toe are rounded shut.
        const closed = k === 0 || k === N - 1;
        positions.push(
          closed
            ? add(add(add(base, mul(forward, u)), mul(lateral, centres[k]!)), [0, height * 0.42, 0])
            : add(add(add(base, mul(forward, u)), mul(lateral, v)), [0, w, 0]),
        );
        colors.push(
          w < 0.013 ? [0.52, 0.53, 0.55] : w < 0.032 ? [0.98, 0.98, 0.97] : [0.93, 0.93, 0.92],
        );
      }
    }
    for (let k = 0; k < N - 1; k++) {
      for (let j = 0; j < M; j++) {
        const a = k * M + j;
        const b = k * M + ((j + 1) % M);
        const c = a + M;
        const d = b + M;
        // Wound so the outside faces outwards (the frame is left-handed in u, v, w on one side).
        if (bone === "lFoot") triangles.push(a, c, b, b, c, d);
        else triangles.push(a, b, c, b, d, c);
      }
    }
    shoes.push({ positions, colors, triangles, bone });
  }

  // Shirt and shorts: soften the anatomy under the fabric (Taubin smoothing keeps the volume).
  const clothVerts = new Set<number>();
  tris.forEach((tri, t) => {
    if (triMaterial[t] === "shirt" || triMaterial[t] === "shorts")
      tri.forEach((i) => clothVerts.add(i));
  });
  for (let iteration = 0; iteration < 16; iteration++) {
    for (const factor of [0.5, -0.53]) {
      const next = new Map<number, V3>();
      for (const i of clothVerts) {
        if (around[i]!.size > 1) continue;
        const nb = [...neighbours[i]!];
        const mean = mul(
          nb.reduce<V3>((acc, j) => add(acc, pos[j]!), [0, 0, 0]),
          1 / nb.length,
        );
        next.set(i, lerp3(pos[i]!, mean, factor));
      }
      for (const [i, q] of next) pos[i] = q;
    }
  }

  // Normals for inflating the garments.
  const normals: V3[] = pos.map(() => [0, 0, 0]);
  for (const [a, b, c] of tris as [number, number, number][]) {
    const n = cross(sub(pos[b]!, pos[a]!), sub(pos[c]!, pos[a]!));
    for (const i of [a, b, c]) normals[i] = add(normals[i]!, n);
  }

  // Split vertices per material, so each garment has its own edge (a real hem).
  const outPos: V3[] = [];
  const outColor: V3[] = [];
  const outSkin: { idx: number[]; w: number[] }[] = [];
  const key = new Map<string, number>();
  const outTris: Record<MaterialName, number[]> = {
    skin: [],
    shirt: [],
    shorts: [],
    socks: [],
    shoes: [],
    hair: [],
    eyes: [],
  };
  const eyeCentre = (p: V3) => (p[0] < 0 ? eyeL : eyeR);
  const colorOf = (i: number, m: MaterialName): V3 => {
    const p = pos[i]!;
    if (m === "eyes") {
      const c = eyeCentre(p);
      const d = norm(sub(p, c));
      const front = -d[2];
      if (front > 0.975) return [0.02, 0.02, 0.02];
      if (front > 0.9) return [0.28, 0.17, 0.09];
      return [0.93, 0.91, 0.88];
    }
    if (m !== "skin") return [1, 1, 1];
    const eyeY = (eyeL[1] + eyeR[1]) / 2;
    // Eyebrows: a darker band over each eye, on the front of the face.
    for (const e of [eyeL, eyeR]) {
      const dx = Math.abs(p[0] - e[0]);
      const dy = p[1] - e[1];
      if (p[2] < e[2] + 0.012 && dx < 0.03 && dy > 0.017 && dy < 0.03 - dx * 0.2)
        return [0.33, 0.25, 0.2];
    }
    // Lips.
    const m0 = sub(p, mouth);
    if (Math.abs(m0[0]) < 0.026 && Math.abs(m0[1]) < 0.011 && p[2] < mouth[2] + 0.005)
      return [0.9, 0.7, 0.68];
    // A little warmth on cheeks, nose, ears, knees and elbows.
    let r = 1;
    let g = 1;
    let b = 1;
    const face = p[1] > eyeY - 0.07 && p[1] < eyeY + 0.01 && p[2] < head[2] - 0.05;
    if (face) {
      r = 1.0;
      g = 0.95;
      b = 0.94;
    }
    for (const S of [L, R]) {
      if (len(sub(p, S.knee)) < 0.06 || len(sub(p, S.elbow)) < 0.045) {
        g *= 0.95;
        b *= 0.94;
      }
    }
    return [r, g, b];
  };
  for (const [t, tri] of tris.entries()) {
    const m = triMaterial[t]!;
    // The bare foot inside the trainers is not drawn.
    if (m === "shoes") continue;
    const out = tri.map((i) => {
      const k = `${i}:${m}`;
      let j = key.get(k);
      if (j === undefined) {
        j = outPos.length;
        key.set(k, j);
        // Shorts flare towards the hem.
        const thigh = primary[i] === "lThigh" || primary[i] === "rThigh";
        const flare = m === "shorts" ? (thigh ? 0.8 + along[i]! * 2.4 : 0.8) : 1;
        const offset = mul(norm(normals[i]!), INFLATE[m] * flare);
        outPos.push(add(pos[i]!, offset));
        outColor.push(colorOf(i, m));
        const w = [...weights[i]!.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
        const total = w.reduce((s, [, x]) => s + x, 0) || 1;
        outSkin.push({ idx: w.map(([b]) => b), w: w.map(([, x]) => x / total) });
      }
      return j;
    });
    outTris[m].push(...out);
  }

  for (const shoe of shoes) {
    const first = outPos.length;
    shoe.positions.forEach((p, k) => {
      outPos.push(p);
      outColor.push(shoe.colors[k]!);
      outSkin.push({ idx: [boneIndex(shoe.bone)], w: [1] });
    });
    outTris.shoes.push(...shoe.triangles.map((i) => first + i));
  }

  // ── Binary: quantised positions, colours, skin indices/weights, indices, groups ──
  const n = outPos.length;
  if (n > 65535) throw new Error(`too many vertices: ${n}`);
  const min: V3 = [Infinity, Infinity, Infinity];
  const max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const p of outPos)
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k]!, p[k]!);
      max[k] = Math.max(max[k]!, p[k]!);
    }
  const positions = new Uint16Array(n * 3);
  outPos.forEach((p, i) => {
    for (let k = 0; k < 3; k++)
      positions[i * 3 + k] = Math.round(((p[k]! - min[k]!) / (max[k]! - min[k]!)) * 65535);
  });
  const colors = new Uint8Array(n * 3);
  outColor.forEach((c, i) =>
    c.forEach((v, k) => (colors[i * 3 + k] = Math.round(Math.min(1, v) * 255))),
  );
  const skinIndex = new Uint8Array(n * 4);
  const skinWeight = new Uint8Array(n * 4);
  outSkin.forEach(({ idx, w }, i) => {
    let rest = 255;
    for (let k = 0; k < 4; k++) {
      skinIndex[i * 4 + k] = idx[k] ?? 0;
      const q = k === 3 ? rest : Math.round((w[k] ?? 0) * 255);
      skinWeight[i * 4 + k] = Math.max(0, Math.min(rest, q));
      rest -= skinWeight[i * 4 + k]!;
    }
  });
  const groups: { material: MaterialName; start: number; count: number }[] = [];
  const indexList: number[] = [];
  for (const m of MATERIALS) {
    groups.push({ material: m, start: indexList.length, count: outTris[m].length });
    indexList.push(...outTris[m]);
  }
  const indices = new Uint16Array(indexList);
  const header = {
    vertexCount: n,
    indexCount: indices.length,
    bounds: { min: r3(min), max: r3(max) },
    bones: BONES,
    groups,
  };
  const json = Buffer.from(JSON.stringify(header));
  const pad = (b: Buffer) => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4, 0x20)]);
  const jsonPadded = pad(json);
  const head4 = Buffer.alloc(8);
  head4.write("TNH1", 0, "ascii");
  head4.writeUInt32LE(jsonPadded.length, 4);
  const body = Buffer.concat([
    head4,
    jsonPadded,
    Buffer.from(positions.buffer),
    pad(Buffer.from(colors.buffer)),
    Buffer.from(skinIndex.buffer),
    Buffer.from(skinWeight.buffer),
    Buffer.from(indices.buffer),
  ]);
  mkdirSync(join(ROOT, "public", "3d"), { recursive: true });
  writeFileSync(join(ROOT, "public", "3d", "jucator-v1.bin"), body);

  // ── Rig constants for player.ts ──
  const avg = (a: number, b: number) => (a + b) / 2;
  const skull = pos.filter((p, i) => primary[i] === "head" && !isEye[i] && p[1] > head[1] + 0.02);
  const skullMin: V3 = [Infinity, Infinity, Infinity];
  const skullMax: V3 = [-Infinity, -Infinity, -Infinity];
  for (const p of skull)
    for (let k = 0; k < 3; k++) {
      skullMin[k] = Math.min(skullMin[k]!, p[k]!);
      skullMax[k] = Math.max(skullMax[k]!, p[k]!);
    }
  const rig = {
    scale: round(scale, 6),
    height: round(max[1]),
    body: {
      ankle: round(avg(L.ankle[1], R.ankle[1])),
      thigh: round(avg(len(sub(L.knee, L.hip)), len(sub(R.knee, R.hip)))),
      shin: round(avg(len(sub(L.ankle, L.knee)), len(sub(R.ankle, R.knee)))),
      upperArm: round(avg(len(sub(L.elbow, L.shoulder)), len(sub(R.elbow, R.shoulder)))),
      forearm: round(avg(len(sub(L.wrist, L.elbow)), len(sub(R.wrist, R.elbow)))),
      hipOffset: r3([avg(R.hip[0], -L.hip[0]), -HIP_DROP, 0]),
      spine: r3([0, SPINE_UP, 0]),
      shoulder: r3([
        avg(R.shoulder[0], -L.shoulder[0]),
        avg(R.shoulder[1], L.shoulder[1]) - chestOrigin[1],
        avg(R.shoulder[2], L.shoulder[2]) - chestOrigin[2],
      ]),
      neck: r3(sub(neck, chestOrigin)),
      head: r3(sub(head, neck)),
    },
    rest: {
      pelvis: r3(pelvis),
      chest: r3(chestOrigin),
      neck: r3(neck),
      head: r3(head),
      lShoulder: r3(L.shoulder),
      lElbow: r3(L.elbow),
      lWrist: r3(L.wrist),
      rShoulder: r3(R.shoulder),
      rElbow: r3(R.elbow),
      rWrist: r3(R.wrist),
      lHip: r3(L.hip),
      lKnee: r3(L.knee),
      lAnkle: r3(L.ankle),
      lToe: r3(L.toe),
      rHip: r3(R.hip),
      rKnee: r3(R.knee),
      rAnkle: r3(R.ankle),
      rToe: r3(R.toe),
    },
    /** Rest racket frame of each hand: origin (handle centre in the fist) and x, y, z axes. */
    grip: {
      r: { origin: r3(gripR.origin), x: r3(gripR.x), y: r3(gripR.y), z: r3(gripR.z) },
      l: { origin: r3(gripL.origin), x: r3(gripL.x), y: r3(gripL.y), z: r3(gripL.z) },
    },
    skull: { centre: r3(mul(add(skullMin, skullMax), 0.5)), size: r3(sub(skullMax, skullMin)) },
  };
  const ts = `/**
 * Generated by scripts/build-3d-assets.ts from the MakeHuman base mesh (CC0): the rest pose of
 * the player model in rig space (metres; facing -z, right hand towards +x, feet on y = 0).
 * Do not edit by hand; run \`npm run assets:3d\`.
 */
export const HUMAN = ${JSON.stringify(rig, null, 2)} as const;
`;
  writeFileSync(join(ROOT, "components", "court3d", "engine", "humanRig.ts"), ts);
  console.info(
    `Jucător: ${n} vârfuri, ${indices.length / 3} triunghiuri, ${(body.length / 1024).toFixed(0)} KB; înălțime ${rig.height} m.`,
  );
  console.info(JSON.stringify(rig.body));
}

// ─── The sky and grounds ─────────────────────────────────────────────────────

function decodeRgbe(buffer: Buffer): { width: number; height: number; data: Float32Array } {
  let p = 0;
  const readLine = () => {
    let s = "";
    while (buffer[p] !== 0x0a) s += String.fromCharCode(buffer[p++]!);
    p++;
    return s;
  };
  while (readLine() !== "") {
    /* header lines */
  }
  const size = readLine().split(" ");
  const height = Number(size[1]);
  const width = Number(size[3]);
  const data = new Float32Array(width * height * 3);
  const scan = new Uint8Array(width * 4);
  for (let y = 0; y < height; y++) {
    if (buffer[p] === 2 && buffer[p + 1] === 2) {
      p += 4;
      for (let c = 0; c < 4; c++) {
        let x = 0;
        while (x < width) {
          let count = buffer[p++]!;
          if (count > 128) {
            count -= 128;
            const value = buffer[p++]!;
            for (let i = 0; i < count; i++) scan[x++ * 4 + c] = value;
          } else for (let i = 0; i < count; i++) scan[x++ * 4 + c] = buffer[p++]!;
        }
      }
    } else {
      for (let x = 0; x < width * 4; x++) scan[x] = buffer[p++]!;
    }
    for (let x = 0; x < width; x++) {
      const e = scan[x * 4 + 3]!;
      const f = e ? 2 ** (e - 136) : 0;
      for (let c = 0; c < 3; c++) data[(y * width + x) * 3 + c] = scan[x * 4 + c]! * f;
    }
  }
  return { width, height, data };
}

async function buildSky() {
  const { width, height, data } = decodeRgbe(await fetchCached(HDRI, "spruit_sunrise_1k.hdr"));
  // Where the sun is, for the directional light (the brightest pixel).
  let best = 0;
  let sunX = 0;
  let sunY = 0;
  for (let i = 0; i < width * height; i++) {
    const l = data[i * 3]! * 0.2126 + data[i * 3 + 1]! * 0.7152 + data[i * 3 + 2]! * 0.0722;
    if (l > best) {
      best = l;
      sunX = i % width;
      sunY = Math.floor(i / width);
    }
  }
  // The photograph itself: sharp's decoder reads the base (SDR) image and ignores the gain map.
  const photo = await fetchCached(PHOTO, "spruit_sunrise_4k.hdr.jpg");
  const out = join(ROOT, "public", "3d");
  await sharp(photo)
    .jpeg({ quality: 80, mozjpeg: true, chromaSubsampling: "4:2:0" })
    .toFile(join(out, "cer-4k-v1.jpg"));
  await sharp(photo)
    .resize(2048, 1024, { kernel: "lanczos3" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(join(out, "cer-v1.jpg"));
  const azimuth = (sunX / width) * 360 - 180;
  const elevation = 90 - (sunY / height) * 180;
  console.info(`Cer: soarele la azimut ${azimuth.toFixed(1)}°, înălțime ${elevation.toFixed(1)}°.`);
}

await buildPlayer();
await buildSky();
