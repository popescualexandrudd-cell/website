/**
 * Drawing primitives for the compositional placeholder paintings.
 * Everything is plain SVG so the files stay small, scale to any size and can be rasterised
 * by sharp in `npm run images`. Colours come from the palette in DECISIONS.md.
 */

export const palette = {
  pergament: "#ECE3CF",
  pergamentAdanc: "#E2D5B8",
  cerneala: "#1D1A15",
  sepia: "#6B4A2B",
  ultramarin: "#1846C4",
  cer: "#9CC0EC",
  aur: "#C9A13B",
  aurDeschis: "#F4DC8A",
  aurInchis: "#6E5214",
  zgura: "#9E4A28",
  noapte: "#0B1B4D",
  ocru: "#B8862E",
  umbra: "#3A2A1C",
  piele: "#D9B08C",
  pieleUmbra: "#B98A63",
  lemn: "#7A5634",
  frunza: "#4F6B3A",
  frunzaDeschis: "#6E8A4A",
  in: "#EFE6D2",
};

export type Canvas = { w: number; h: number };

/** Deterministic pseudo-random numbers, so regenerating gives identical files. */
export function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const r1 = (n: number) => Math.round(n * 10) / 10;

export function svgDocument(canvas: Canvas, defs: string, body: string, opaque = true): string {
  const { w, h } = canvas;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`,
    `<defs>${commonDefs(canvas)}${defs}</defs>`,
    body,
    opaque ? grainOverlay(canvas) : "",
    "</svg>",
  ].join("");
}

function commonDefs({ w, h }: Canvas): string {
  const scale = Math.max(w, h) / 2560;
  return `
<radialGradient id="ballFill" cx="0.36" cy="0.32" r="0.72">
  <stop offset="0" stop-color="#FFF6CF"/>
  <stop offset="0.2" stop-color="${palette.aurDeschis}"/>
  <stop offset="0.58" stop-color="${palette.aur}"/>
  <stop offset="1" stop-color="${palette.aurInchis}"/>
</radialGradient>
<radialGradient id="ballGlow" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0" stop-color="${palette.aurDeschis}" stop-opacity="0.55"/>
  <stop offset="0.45" stop-color="${palette.aur}" stop-opacity="0.18"/>
  <stop offset="1" stop-color="${palette.aur}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
  <stop offset="0.55" stop-color="#1D1A15" stop-opacity="0"/>
  <stop offset="1" stop-color="#1D1A15" stop-opacity="0.38"/>
</radialGradient>
<filter id="grain" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="${r1(0.85 / scale)}" numOctaves="2" seed="7" stitchTiles="stitch"/>
  <feColorMatrix type="matrix" values="0 0 0 0 0.11  0 0 0 0 0.10  0 0 0 0 0.08  0 0 0 0.55 -0.12"/>
</filter>
<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${r1(18 * scale)}"/></filter>
<filter id="softer" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${r1(46 * scale)}"/></filter>
<filter id="cloudSoft" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="${r1(7 * scale)}"/></filter>
<filter id="blurS" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${r1(4 * scale)}"/></filter>`;
}

function grainOverlay({ w, h }: Canvas): string {
  return `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.5"/><rect width="${w}" height="${h}" fill="url(#vignette)"/>`;
}

/** The gold tennis ball: radial gradient, the seam and a soft glow. */
export function ball(cx: number, cy: number, r: number, options: { glow?: boolean; shadow?: boolean } = {}): string {
  const seamWidth = r1(r * 0.075);
  const seam = (flip: number) => {
    const x0 = cx + flip * r * 0.62;
    return `<path d="M ${r1(x0)} ${r1(cy - r * 0.8)} C ${r1(cx + flip * r * 0.1)} ${r1(cy - r * 0.35)}, ${r1(cx + flip * r * 0.1)} ${r1(cy + r * 0.35)}, ${r1(x0)} ${r1(cy + r * 0.8)}" fill="none" stroke="#FFF3CC" stroke-opacity="0.55" stroke-width="${seamWidth}" stroke-linecap="round"/>`;
  };
  const clipId = `ballClip${Math.round(cx)}x${Math.round(cy)}`;
  return [
    options.glow ? `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r * 3.2)}" fill="url(#ballGlow)"/>` : "",
    options.shadow
      ? `<ellipse cx="${r1(cx + r * 0.15)}" cy="${r1(cy + r * 1.25)}" rx="${r1(r * 0.9)}" ry="${r1(r * 0.22)}" fill="#1D1A15" opacity="0.28" filter="url(#blurS)"/>`
      : "",
    `<clipPath id="${clipId}"><circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}"/></clipPath>`,
    `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}" fill="url(#ballFill)"/>`,
    `<g clip-path="url(#${clipId})">${seam(-1)}${seam(1)}</g>`,
  ].join("");
}

/** A cumulus cloud: a flat, shaded base and a dome of puffs lit from the upper left. */
export function cloud(cx: number, cy: number, width: number, seed: number, opacity = 0.95): string {
  const rand = rng(seed);
  const shadow: string[] = [];
  const body: string[] = [];
  const light: string[] = [];
  const count = 13;
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const dome = Math.sin(t * Math.PI);
    const x = cx - width * 0.46 + t * width * 0.92 + (rand() - 0.5) * width * 0.05;
    const r = width * (0.07 + dome * 0.1 + rand() * 0.04);
    const y = cy - dome * width * 0.13 - rand() * width * 0.04;
    shadow.push(`<circle cx="${r1(x + r * 0.12)}" cy="${r1(y + r * 0.22)}" r="${r1(r)}"/>`);
    body.push(`<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r * 0.96)}"/>`);
    if (rand() > 0.35) light.push(`<circle cx="${r1(x - r * 0.25)}" cy="${r1(y - r * 0.3)}" r="${r1(r * 0.55)}"/>`);
  }
  const base = `<rect x="${r1(cx - width * 0.48)}" y="${r1(cy - width * 0.04)}" width="${r1(width * 0.96)}" height="${r1(width * 0.1)}" rx="${r1(width * 0.05)}"/>`;
  return `<g opacity="${opacity}" filter="url(#cloudSoft)">
<g fill="#AFBBD2">${shadow.join("")}<rect x="${r1(cx - width * 0.47)}" y="${r1(cy)}" width="${r1(width * 0.94)}" height="${r1(width * 0.09)}" rx="${r1(width * 0.045)}"/></g>
<g fill="#EEF0EE">${body.join("")}${base}</g>
<g fill="#FFFFFF" opacity="0.8">${light.join("")}</g>
</g>`;
}

type Pose = "stand" | "reachUp" | "holdChest" | "swing" | "serve" | "pointUp" | "guide" | "sit" | "unroll";

/**
 * A standing figure in period dress, drawn with rounded strokes for limbs and a bell-shaped robe.
 * (x, y) is the point between the feet; h is the full height in pixels.
 */
export function person(options: {
  x: number;
  y: number;
  h: number;
  robe: string;
  skin?: string;
  hair?: string;
  facing?: 1 | -1;
  pose?: Pose;
  shortRobe?: boolean;
}): string {
  const { x, y, h, robe } = options;
  const skin = options.skin ?? palette.piele;
  const hair = options.hair ?? "#4A3322";
  const f = options.facing ?? 1;
  const pose = options.pose ?? "stand";
  const headR = h * 0.068;
  const headY = y - h + headR;
  const neckY = headY + headR * 1.05;
  const shoulderY = y - h * 0.8;
  const hemY = options.shortRobe ? y - h * 0.34 : y - h * 0.02;
  const hipY = y - h * 0.48;
  const sw = h * 0.13;
  const hem = options.shortRobe ? h * 0.15 : h * 0.21;
  const limb = r1(h * 0.052);
  const parts: string[] = [];

  const shoulderL = { x: x - sw * 0.85, y: shoulderY + h * 0.02 };
  const shoulderR = { x: x + sw * 0.85, y: shoulderY + h * 0.02 };
  const arm = (from: { x: number; y: number }, elbow: { x: number; y: number }, hand: { x: number; y: number }) =>
    `<path d="M ${r1(from.x)} ${r1(from.y)} Q ${r1(elbow.x)} ${r1(elbow.y)} ${r1(hand.x)} ${r1(hand.y)}" fill="none" stroke="${robe}" stroke-width="${limb}" stroke-linecap="round"/><circle cx="${r1(hand.x)}" cy="${r1(hand.y)}" r="${r1(h * 0.028)}" fill="${skin}"/>`;

  // legs (visible under a short tunic)
  if (options.shortRobe) {
    const legW = r1(h * 0.045);
    const stance = pose === "serve" || pose === "swing" ? h * 0.12 : h * 0.06;
    parts.push(
      `<path d="M ${r1(x - h * 0.05)} ${r1(hipY + h * 0.1)} L ${r1(x - stance)} ${r1(y)}" stroke="${palette.umbra}" stroke-width="${legW}" stroke-linecap="round"/>`,
      `<path d="M ${r1(x + h * 0.05)} ${r1(hipY + h * 0.1)} L ${r1(x + stance)} ${r1(y)}" stroke="${palette.umbra}" stroke-width="${legW}" stroke-linecap="round"/>`,
    );
  }

  if (pose === "sit") {
    parts.push(
      `<path d="M ${r1(x - sw)} ${r1(shoulderY)} C ${r1(x - sw * 1.1)} ${r1(hipY)}, ${r1(x - sw * 1.3)} ${r1(y - h * 0.22)}, ${r1(x - sw * 1.4)} ${r1(y - h * 0.2)} L ${r1(x + sw * 2.4)} ${r1(y - h * 0.2)} C ${r1(x + sw * 2.5)} ${r1(y - h * 0.3)}, ${r1(x + sw * 1.2)} ${r1(hipY)}, ${r1(x + sw)} ${r1(shoulderY)} Z" fill="${robe}"/>`,
    );
  } else {
    parts.push(
      `<path d="M ${r1(x - sw)} ${r1(shoulderY)} C ${r1(x - sw * 1.05)} ${r1(hipY)}, ${r1(x - hem * 0.9)} ${r1(hemY - h * 0.1)}, ${r1(x - hem)} ${r1(hemY)} Q ${r1(x)} ${r1(hemY + h * 0.03)} ${r1(x + hem)} ${r1(hemY)} C ${r1(x + hem * 0.9)} ${r1(hemY - h * 0.1)}, ${r1(x + sw * 1.05)} ${r1(hipY)}, ${r1(x + sw)} ${r1(shoulderY)} Q ${r1(x)} ${r1(shoulderY - h * 0.04)} ${r1(x - sw)} ${r1(shoulderY)} Z" fill="${robe}"/>`,
      // chiaroscuro: the side away from the light is darker
      `<path d="M ${r1(x + sw * 0.2)} ${r1(shoulderY)} C ${r1(x + sw * 0.5)} ${r1(hipY)}, ${r1(x + hem * 0.5)} ${r1(hemY - h * 0.1)}, ${r1(x + hem * 0.55)} ${r1(hemY)} L ${r1(x + hem)} ${r1(hemY)} C ${r1(x + hem * 0.9)} ${r1(hemY - h * 0.1)}, ${r1(x + sw * 1.05)} ${r1(hipY)}, ${r1(x + sw)} ${r1(shoulderY)} Z" fill="#000" opacity="0.18"/>`,
    );
  }

  // arms by pose
  const reach = (side: 1 | -1, dx: number, dy: number, bend = 0) => {
    const s = side === 1 ? shoulderR : shoulderL;
    const hand = { x: s.x + dx * h * f, y: s.y + dy * h };
    const elbow = { x: (s.x + hand.x) / 2 + bend * h * f, y: (s.y + hand.y) / 2 + Math.abs(bend) * h * 0.4 };
    return arm(s, elbow, hand);
  };
  switch (pose) {
    case "reachUp":
      parts.push(reach(1, 0.2, -0.42, -0.04), reach(-1, -0.05, 0.22, 0.02));
      break;
    case "holdChest":
      parts.push(reach(-1, 0.16, 0.1, 0.06), reach(1, -0.04, 0.24, 0.02));
      break;
    case "swing":
      parts.push(reach(1, 0.3, -0.02, 0.02), reach(-1, -0.18, 0.06, -0.02));
      break;
    case "serve":
      parts.push(reach(1, 0.08, -0.46, 0), reach(-1, -0.14, -0.3, -0.03));
      break;
    case "pointUp":
      parts.push(reach(1, 0.28, -0.4, 0), reach(-1, -0.04, 0.24, 0.02));
      break;
    case "guide":
      parts.push(reach(1, 0.26, 0.06, 0.03), reach(-1, 0.18, 0.12, 0.05));
      break;
    case "unroll":
      parts.push(reach(1, 0.24, 0.02, 0.03), reach(-1, 0.22, 0.2, 0.04));
      break;
    case "sit":
      parts.push(reach(1, 0.16, 0.2, 0.03));
      break;
    default:
      parts.push(reach(1, 0.04, 0.3, 0.01), reach(-1, -0.04, 0.3, -0.01));
  }

  // neck and head
  parts.push(
    `<rect x="${r1(x - h * 0.022)}" y="${r1(neckY - h * 0.01)}" width="${r1(h * 0.044)}" height="${r1(shoulderY - neckY + h * 0.02)}" fill="${skin}"/>`,
    `<circle cx="${r1(x)}" cy="${r1(headY)}" r="${r1(headR)}" fill="${skin}"/>`,
    `<path d="M ${r1(x - headR * f)} ${r1(headY)} A ${r1(headR)} ${r1(headR)} 0 0 ${f === 1 ? 1 : 0} ${r1(x + headR * 0.9 * f)} ${r1(headY - headR * 0.35)} Q ${r1(x)} ${r1(headY - headR * 0.2)} ${r1(x - headR * f)} ${r1(headY + headR * 0.4)} Z" fill="${hair}"/>`,
  );
  return `<g>${parts.join("")}</g>`;
}

/** An old wooden racquet: long handle, small oval head, strings. */
export function racquet(x: number, y: number, length: number, angleDeg: number, color = palette.lemn): string {
  const headRx = length * 0.16;
  const headRy = length * 0.23;
  const handle = length - headRy * 2;
  const id = `rq${Math.round(x)}${Math.round(y)}`;
  const strings: string[] = [];
  for (let i = -3; i <= 3; i += 1) {
    strings.push(
      `<line x1="${r1(i * headRx * 0.28)}" y1="${r1(-handle - headRy * 2)}" x2="${r1(i * headRx * 0.28)}" y2="${r1(-handle)}"/>`,
    );
  }
  for (let j = 1; j <= 6; j += 1) {
    const yy = -handle - (headRy * 2 * j) / 7;
    strings.push(`<line x1="${r1(-headRx)}" y1="${r1(yy)}" x2="${r1(headRx)}" y2="${r1(yy)}"/>`);
  }
  return `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${angleDeg})">
<clipPath id="${id}"><ellipse cx="0" cy="${r1(-handle - headRy)}" rx="${r1(headRx)}" ry="${r1(headRy)}"/></clipPath>
<line x1="0" y1="0" x2="0" y2="${r1(-handle)}" stroke="${color}" stroke-width="${r1(length * 0.045)}" stroke-linecap="round"/>
<g clip-path="url(#${id})" stroke="#E8DCC0" stroke-opacity="0.75" stroke-width="${r1(length * 0.008)}">${strings.join("")}</g>
<ellipse cx="0" cy="${r1(-handle - headRy)}" rx="${r1(headRx)}" ry="${r1(headRy)}" fill="none" stroke="${color}" stroke-width="${r1(length * 0.03)}"/>
</g>`;
}

/** Tennis court lines seen from above (doubles court). `length` runs along x, or along y when vertical. */
export function courtLines(
  cx: number,
  cy: number,
  width: number,
  stroke: string,
  strokeWidth: number,
  extra = "",
  vertical = false,
): string {
  const len = width;
  const wid = (width * 10.97) / 23.77;
  const x0 = cx - len / 2;
  const y0 = cy - wid / 2;
  const alley = (wid * 1.37) / 10.97;
  const service = (len * 6.4) / 23.77;
  const lines = [
    `<rect x="${r1(x0)}" y="${r1(y0)}" width="${r1(len)}" height="${r1(wid)}"/>`,
    `<line x1="${r1(x0)}" y1="${r1(y0 + alley)}" x2="${r1(x0 + len)}" y2="${r1(y0 + alley)}"/>`,
    `<line x1="${r1(x0)}" y1="${r1(y0 + wid - alley)}" x2="${r1(x0 + len)}" y2="${r1(y0 + wid - alley)}"/>`,
    `<line x1="${r1(cx - service)}" y1="${r1(y0 + alley)}" x2="${r1(cx - service)}" y2="${r1(y0 + wid - alley)}"/>`,
    `<line x1="${r1(cx + service)}" y1="${r1(y0 + alley)}" x2="${r1(cx + service)}" y2="${r1(y0 + wid - alley)}"/>`,
    `<line x1="${r1(cx - service)}" y1="${r1(cy)}" x2="${r1(cx + service)}" y2="${r1(cy)}"/>`,
    `<line x1="${r1(cx)}" y1="${r1(y0 - wid * 0.05)}" x2="${r1(cx)}" y2="${r1(y0 + wid * 1.05)}" stroke-width="${r1(strokeWidth * 1.6)}"/>`,
    `<line x1="${r1(x0)}" y1="${r1(cy)}" x2="${r1(x0 + len * 0.012)}" y2="${r1(cy)}"/>`,
    `<line x1="${r1(x0 + len)}" y1="${r1(cy)}" x2="${r1(x0 + len * 0.988)}" y2="${r1(cy)}"/>`,
  ];
  const rotate = vertical ? ` transform="rotate(90 ${r1(cx)} ${r1(cy)})"` : "";
  return `<g fill="none" stroke="${stroke}" stroke-width="${r1(strokeWidth)}" stroke-linecap="square"${rotate}>${lines.join("")}${extra}</g>`;
}

export function stars(canvas: Canvas, count: number, seed: number, maxY = 1): string {
  const rand = rng(seed);
  const items: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const x = rand() * canvas.w;
    const y = rand() * canvas.h * maxY;
    const r = (0.6 + rand() * 1.9) * (canvas.w / 2560) * 1.4;
    const o = 0.35 + rand() * 0.6;
    items.push(`<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="#F4EEDC" opacity="${r1(o)}"/>`);
  }
  return items.join("");
}
