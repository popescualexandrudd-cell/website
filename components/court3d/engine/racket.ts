import {
  CatmullRomCurve3,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  type Texture,
} from "three";

/**
 * A 27-inch (68.5 cm) racket, 100 in² head. Local frame: the butt cap at the origin, the
 * handle and head along +y, the string bed in the xy plane (its normal is +z).
 */
export const RACKET = {
  length: 0.685,
  gripAt: 0.07,
  headCentre: 0.525,
  headHalfLength: 0.162,
  headHalfWidth: 0.128,
};

/** Distance from the hand (grip point) to the sweet spot along the racket axis. */
export const SWEET_SPOT = RACKET.headCentre - RACKET.gripAt - 0.02;

export function buildRacket(textures: { strings: Texture; grip: Texture }, accent: number): Group {
  const group = new Group();
  const frameMaterial = new MeshPhysicalMaterial({
    color: 0x18181b,
    roughness: 0.32,
    metalness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.18,
  });
  const accentMaterial = new MeshPhysicalMaterial({
    color: accent,
    roughness: 0.35,
    clearcoat: 1,
    clearcoatRoughness: 0.2,
  });

  // Head hoop: an ellipse, slightly pointed at the throat end, swept as a tube.
  const { headCentre: c, headHalfLength: a, headHalfWidth: b } = RACKET;
  const hoop: Vector3[] = [];
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    const narrow = 1 - 0.08 * Math.max(0, -Math.sin(t));
    hoop.push(new Vector3(Math.cos(t) * b * narrow, c + Math.sin(t) * a, 0));
  }
  const hoopCurve = new CatmullRomCurve3(hoop, true);
  const head = new Mesh(new TubeGeometry(hoopCurve, 96, 0.011, 8, true), frameMaterial);
  group.add(head);

  // A painted band on the upper hoop.
  const bandPoints = hoop.filter((_, i) => i >= 6 && i <= 18);
  const band = new Mesh(
    new TubeGeometry(new CatmullRomCurve3(bandPoints), 32, 0.0118, 8, false),
    accentMaterial,
  );
  group.add(band);

  // Throat: two arms from the handle top to the lower hoop.
  const throatTop = c - a * 0.93;
  for (const side of [-1, 1]) {
    const arm = new CatmullRomCurve3([
      new Vector3(0, 0.235, 0),
      new Vector3(side * 0.035, 0.29, 0),
      new Vector3(side * 0.075, throatTop - 0.01, 0),
      new Vector3(side * 0.1, throatTop + 0.03, 0),
    ]);
    group.add(new Mesh(new TubeGeometry(arm, 20, 0.009, 8, false), frameMaterial));
  }
  // Throat bridge.
  const bridge = new Mesh(new CylinderGeometry(0.007, 0.007, 0.15, 8), frameMaterial);
  bridge.rotation.z = Math.PI / 2;
  bridge.position.y = throatTop + 0.005;
  group.add(bridge);

  // Handle: octagonal, wrapped.
  const gripMaterial = new MeshStandardMaterial({ map: textures.grip, roughness: 0.85 });
  const handle = new Mesh(new CylinderGeometry(0.016, 0.017, 0.2, 8), gripMaterial);
  handle.position.y = 0.105;
  group.add(handle);
  const shaft = new Mesh(new CylinderGeometry(0.012, 0.015, 0.05, 8), frameMaterial);
  shaft.position.y = 0.225;
  group.add(shaft);
  const butt = new Mesh(new CylinderGeometry(0.019, 0.018, 0.012, 8), accentMaterial);
  butt.position.y = 0.004;
  group.add(butt);

  // String bed.
  const shape = new Shape();
  for (let i = 0; i <= 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    const narrow = 1 - 0.08 * Math.max(0, -Math.sin(t));
    const x = Math.cos(t) * (b - 0.006) * narrow;
    const y = c + Math.sin(t) * (a - 0.006);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const bed = new ShapeGeometry(shape, 24);
  // Map the bed's bounding box to the string texture.
  const uv = bed.getAttribute("uv");
  const pos = bed.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) + b) / (2 * b), (pos.getY(i) - (c - a)) / (2 * a));
  }
  const strings = new Mesh(
    bed,
    new MeshStandardMaterial({
      map: textures.strings,
      transparent: true,
      alphaTest: 0.25,
      side: DoubleSide,
      roughness: 0.6,
    }),
  );
  group.add(strings);

  // Dampener near the throat.
  const dampener = new Mesh(new SphereGeometry(0.008, 8, 6), accentMaterial);
  dampener.position.set(0, c - a + 0.03, 0);
  group.add(dampener);

  group.traverse((o) => {
    if (o instanceof Mesh) o.castShadow = true;
  });
  return group;
}
