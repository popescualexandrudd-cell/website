import {
  BufferGeometry,
  Float32BufferAttribute,
  Uint16BufferAttribute,
  Uint8BufferAttribute,
} from "three";

/** The player model built by scripts/build-3d-assets.ts (MakeHuman base mesh, CC0). */
export const HUMAN_URL = "/3d/jucator-v1.bin";

export const HUMAN_MATERIALS = [
  "skin",
  "shirt",
  "shorts",
  "socks",
  "shoes",
  "hair",
  "eyes",
] as const;
export type HumanMaterial = (typeof HUMAN_MATERIALS)[number];

type Header = {
  vertexCount: number;
  indexCount: number;
  bounds: { min: [number, number, number]; max: [number, number, number] };
  bones: string[];
  groups: { material: HumanMaterial; start: number; count: number }[];
};

export type HumanAsset = { geometry: BufferGeometry; bones: string[] };

/**
 * Reads the binary model: a JSON header, then quantised positions, vertex colours, four bone
 * indices and weights per vertex, and the triangle list sorted by material.
 */
export function parseHuman(buffer: ArrayBuffer): HumanAsset {
  const view = new DataView(buffer);
  const magic = String.fromCharCode(...new Uint8Array(buffer, 0, 4));
  if (magic !== "TNH1") throw new Error("Unknown player model format");
  const jsonLength = view.getUint32(4, true);
  const header = JSON.parse(
    new TextDecoder().decode(new Uint8Array(buffer, 8, jsonLength)),
  ) as Header;
  const n = header.vertexCount;
  let offset = 8 + jsonLength;
  const take = <T>(make: (offset: number) => T, bytes: number, align = 1): T => {
    const value = make(offset);
    offset += bytes + ((align - (bytes % align)) % align);
    return value;
  };
  const quantised = take((o) => new Uint16Array(buffer.slice(o, o + n * 6)), n * 6);
  const colors = take((o) => new Uint8Array(buffer, o, n * 3), n * 3, 4);
  const skinIndex = take((o) => new Uint8Array(buffer, o, n * 4), n * 4);
  const skinWeight = take((o) => new Uint8Array(buffer, o, n * 4), n * 4);
  const indices = take(
    (o) => new Uint16Array(buffer.slice(o, o + header.indexCount * 2)),
    header.indexCount * 2,
  );

  const { min, max } = header.bounds;
  const positions = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) {
    const k = i % 3;
    positions[i] = min[k]! + ((quantised[i] ?? 0) / 65535) * (max[k]! - min[k]!);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Uint8BufferAttribute(colors, 3, true));
  geometry.setAttribute("skinIndex", new Uint16BufferAttribute(Uint16Array.from(skinIndex), 4));
  geometry.setAttribute("skinWeight", new Uint8BufferAttribute(skinWeight, 4, true));
  geometry.setIndex(new Uint16BufferAttribute(indices, 1));
  for (const group of header.groups) {
    const material = HUMAN_MATERIALS.indexOf(group.material);
    if (group.count > 0) geometry.addGroup(group.start, group.count, material);
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return { geometry, bones: header.bones };
}

export async function loadHuman(url = HUMAN_URL): Promise<HumanAsset> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return parseHuman(await response.arrayBuffer());
}
