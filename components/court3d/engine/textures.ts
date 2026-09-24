import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";

/**
 * Procedural textures, painted once on 2D canvases when the scene starts. Nothing is
 * downloaded: the whole court (clay, lines, net, ball felt, strings) weighs a few kilobytes of
 * code instead of megabytes of images.
 */

/** Small deterministic generator, so the court looks the same on every visit. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const el = document.createElement("canvas");
  el.width = width;
  el.height = height;
  const ctx = el.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return [el, ctx];
}

function toTexture(
  el: HTMLCanvasElement,
  options: { color?: boolean; repeat?: boolean; anisotropy?: number } = {},
): Texture {
  const texture = new CanvasTexture(el);
  texture.colorSpace = options.color === false ? NoColorSpace : SRGBColorSpace;
  texture.wrapS = texture.wrapT = options.repeat === false ? ClampToEdgeWrapping : RepeatWrapping;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.anisotropy = options.anisotropy ?? 4;
  texture.needsUpdate = true;
  return texture;
}

/** Tileable value noise on a size × size grid of `cells`. */
function tileNoise(size: number, cells: number, random: () => number): Float32Array {
  const grid = new Float32Array(cells * cells);
  for (let i = 0; i < grid.length; i++) grid[i] = random();
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const gy = (y / size) * cells;
    const y0 = Math.floor(gy);
    const fy = gy - y0;
    const sy = fy * fy * (3 - 2 * fy);
    for (let x = 0; x < size; x++) {
      const gx = (x / size) * cells;
      const x0 = Math.floor(gx);
      const fx = gx - x0;
      const sx = fx * fx * (3 - 2 * fx);
      const a = grid[(y0 % cells) * cells + (x0 % cells)] ?? 0;
      const b = grid[(y0 % cells) * cells + ((x0 + 1) % cells)] ?? 0;
      const c = grid[((y0 + 1) % cells) * cells + (x0 % cells)] ?? 0;
      const d = grid[((y0 + 1) % cells) * cells + ((x0 + 1) % cells)] ?? 0;
      out[y * size + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    }
  }
  return out;
}

/**
 * The large-scale look of the clay surface (the whole 18.3 × 36.6 m playing area): colour
 * drift, the lighter scuffed zones behind the baselines, brush-drag arcs and sliding marks.
 * Canvas x runs across the court, canvas y along it.
 */
export function clayMacroTexture(maxAnisotropy: number): Texture {
  const W = 512;
  const H = 1024;
  const [el, ctx] = canvas(W, H);
  const random = rng(7);
  const pxPerM = H / 36.57;

  ctx.fillStyle = "#bf6035";
  ctx.fillRect(0, 0, W, H);

  // Broad colour drift: soft blotches, slightly lighter (dry) and darker (damp).
  for (let i = 0; i < 900; i++) {
    const x = random() * W;
    const y = random() * H;
    const r = 18 + random() * 70;
    const light = random() < 0.55;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, light ? "rgba(214,125,78,0.08)" : "rgba(140,58,28,0.07)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Brush-drag arcs: the court is swept in overlapping curves between sets.
  ctx.lineCap = "round";
  for (let i = 0; i < 260; i++) {
    const cx = random() * W;
    const cy = random() * H;
    const r = 60 + random() * 140;
    const start = random() * Math.PI * 2;
    ctx.strokeStyle = random() < 0.5 ? "rgba(222,140,92,0.05)" : "rgba(120,48,22,0.045)";
    ctx.lineWidth = 3 + random() * 7;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, start + 0.6 + random() * 1.2);
    ctx.stroke();
  }

  // Scuffed zones behind both baselines, where players move most.
  const centreX = W / 2;
  for (const baselineY of [6.4 * pxPerM, H - 6.4 * pxPerM]) {
    const g = ctx.createRadialGradient(centreX, baselineY, 0, centreX, baselineY, 4.6 * pxPerM);
    g.addColorStop(0, "rgba(222,150,104,0.16)");
    g.addColorStop(0.55, "rgba(214,136,90,0.07)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, baselineY - 5 * pxPerM, W, 10 * pxPerM);
    // Slide marks: short, pale streaks with a darker leading edge.
    for (let i = 0; i < 46; i++) {
      const x = centreX + (random() - 0.5) * 7.5 * pxPerM;
      const y = baselineY + (random() - 0.5) * 3.2 * pxPerM;
      const len = (0.4 + random() * 1.1) * pxPerM;
      const angle = (random() - 0.5) * 0.9 + (random() < 0.5 ? 0 : Math.PI);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = "rgba(232,166,120,0.2)";
      ctx.beginPath();
      ctx.ellipse(0, 0, len / 2, 0.09 * pxPerM, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(128,52,24,0.16)";
      ctx.beginPath();
      ctx.ellipse(len / 2, 0, 0.1 * pxPerM, 0.08 * pxPerM, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Fine speckle so the surface never looks like flat paint from the broadcast distance.
  const image = ctx.getImageData(0, 0, W, H);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (random() - 0.5) * 16;
    data[i] = Math.min(255, Math.max(0, (data[i] ?? 0) + n));
    data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] ?? 0) + n * 0.75));
    data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] ?? 0) + n * 0.5));
  }
  ctx.putImageData(image, 0, 0);

  return toTexture(el, { repeat: false, anisotropy: maxAnisotropy });
}

/** Tileable granular detail (crushed brick), used as bump and roughness at close range. */
export function clayGrainTexture(maxAnisotropy: number): Texture {
  const size = 256;
  const [el, ctx] = canvas(size, size);
  const random = rng(11);
  const coarse = tileNoise(size, 16, random);
  const fine = tileNoise(size, 64, random);
  const image = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const grain = random();
    const v = 0.45 * (coarse[i] ?? 0) + 0.35 * (fine[i] ?? 0) + 0.2 * grain * grain;
    const byte = Math.round(v * 255);
    image.data[i * 4] = byte;
    image.data[i * 4 + 1] = byte;
    image.data[i * 4 + 2] = byte;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return toTexture(el, { color: false, anisotropy: maxAnisotropy });
}

/** White line tape with clay dust settled on it. UVs are in metres along and across the line. */
export function lineTexture(): Texture {
  const [el, ctx] = canvas(128, 16);
  const random = rng(3);
  ctx.fillStyle = "#f3ece2";
  ctx.fillRect(0, 0, 128, 16);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(${170 + random() * 40},${80 + random() * 30},${40 + random() * 20},${0.12 + random() * 0.3})`;
    const s = 0.6 + random() * 1.8;
    ctx.fillRect(random() * 128, random() * 16, s * 2, s);
  }
  return toTexture(el);
}

/** Knotted net mesh (4.5 cm squares), six squares per tile, on a transparent background. */
export function netTexture(): Texture {
  const size = 128;
  const [el, ctx] = canvas(size, size);
  const step = size / 6;
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(24,24,24,0.95)";
  ctx.lineWidth = 2.2;
  for (let i = 0; i <= 6; i++) {
    const p = i * step;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }
  return toTexture(el);
}

/** Dark green windscreen fabric with a faint weave. */
export function windscreenTexture(): Texture {
  const [el, ctx] = canvas(128, 128);
  const random = rng(5);
  ctx.fillStyle = "#294433";
  ctx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 2) {
    ctx.fillStyle = `rgba(255,255,255,${0.015 + random() * 0.02})`;
    ctx.fillRect(0, y, 128, 1);
  }
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = `rgba(0,0,0,${random() * 0.12})`;
    ctx.fillRect(random() * 128, random() * 128, 2, 1);
  }
  return toTexture(el);
}

/**
 * Tennis-ball felt: optic yellow with the white seam. The seam follows the classic two-lobe
 * curve, painted into an equirectangular map for the sphere's UVs.
 */
export function ballTexture(): Texture {
  const W = 256;
  const H = 128;
  const [el, ctx] = canvas(W, H);
  const random = rng(9);
  ctx.fillStyle = "#d4e157";
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) {
    const shade = random();
    ctx.fillStyle =
      shade < 0.5
        ? `rgba(255,255,210,${0.05 + random() * 0.12})`
        : `rgba(120,130,20,${0.04 + random() * 0.1})`;
    ctx.fillRect(random() * W, random() * H, 1.5, 1.5);
  }
  const a = 0.72;
  const b = 1 - a;
  const c = 2 * Math.sqrt(a * b);
  ctx.fillStyle = "#f4f1e4";
  for (let i = 0; i < 1400; i++) {
    const t = (i / 1400) * Math.PI * 2;
    const x = a * Math.cos(t) + b * Math.cos(3 * t);
    const y = a * Math.sin(t) - b * Math.sin(3 * t);
    const z = c * Math.sin(2 * t);
    const len = Math.hypot(x, y, z);
    const lon = Math.atan2(y / len, x / len);
    const lat = Math.asin(z / len);
    const u = ((lon / (Math.PI * 2) + 0.5) % 1) * W;
    const v = (0.5 - lat / Math.PI) * H;
    ctx.fillRect(u - 1.6, v - 1.6, 3.2, 3.2);
  }
  return toTexture(el);
}

/** String bed: 16 mains × 19 crosses on a transparent background, clipped by the head shape. */
export function stringTexture(): Texture {
  const size = 256;
  const [el, ctx] = canvas(size, size);
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(236,232,214,0.95)";
  ctx.lineWidth = 2;
  for (let i = 1; i <= 16; i++) {
    const x = (i / 17) * size;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let i = 1; i <= 19; i++) {
    const y = (i / 20) * size;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  return toTexture(el, { repeat: false });
}

/** Vertical sky gradient: warm haze at the horizon, soft blue higher up. */
export function skyTexture(): Texture {
  const [el, ctx] = canvas(4, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#7fa3c4");
  g.addColorStop(0.42, "#b9c9d3");
  g.addColorStop(0.5, "#f0d6b4");
  g.addColorStop(0.56, "#e9c7a0");
  g.addColorStop(1, "#8d6a4c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  return toTexture(el, { repeat: false });
}

/** Round soft sprite for the clay dust thrown up by a bounce. */
export function dustTexture(): Texture {
  const [el, ctx] = canvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(214,138,94,0.9)");
  g.addColorStop(0.5, "rgba(200,120,80,0.35)");
  g.addColorStop(1, "rgba(200,120,80,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return toTexture(el, { repeat: false });
}

/** The oval print a ball leaves on clay: pressed, slightly darker, with a pale rim. */
export function ballMarkTexture(): Texture {
  const [el, ctx] = canvas(64, 128);
  const g = ctx.createRadialGradient(32, 64, 4, 32, 64, 30);
  g.addColorStop(0, "rgba(120,46,20,0.55)");
  g.addColorStop(0.7, "rgba(140,58,28,0.35)");
  g.addColorStop(0.86, "rgba(236,170,128,0.45)");
  g.addColorStop(1, "rgba(236,170,128,0)");
  ctx.save();
  ctx.scale(1, 2);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(32, 32, 31, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return toTexture(el, { repeat: false });
}

/** Grip wrap: dark overgrip with the diagonal overlap. */
export function gripTexture(): Texture {
  const [el, ctx] = canvas(32, 128);
  ctx.fillStyle = "#1d1d1f";
  ctx.fillRect(0, 0, 32, 128);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  for (let y = -32; y < 160; y += 12) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(32, y + 10);
    ctx.stroke();
  }
  return toTexture(el);
}
