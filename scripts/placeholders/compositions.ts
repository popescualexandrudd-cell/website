import {
  ball,
  cloud,
  courtLines,
  palette,
  person,
  r1,
  racquet,
  rng,
  stars,
  svgDocument,
  type Canvas,
} from "./primitives";

export type Composition = (canvas: Canvas, mobile: boolean) => string;

const sky = (id: string, stops: [number, string][]) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops
    .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
    .join("")}</linearGradient>`;

function parchmentBase({ w, h }: Canvas, seed: number): string {
  const rand = rng(seed);
  const fibers: string[] = [];
  for (let i = 0; i < 90; i += 1) {
    const y = rand() * h;
    const x = rand() * w;
    const len = (0.05 + rand() * 0.2) * w;
    fibers.push(
      `<path d="M ${r1(x)} ${r1(y)} q ${r1(len / 2)} ${r1((rand() - 0.5) * 12)} ${r1(len)} ${r1((rand() - 0.5) * 8)}" stroke="#B9A57E" stroke-opacity="${r1(0.08 + rand() * 0.1)}" stroke-width="${r1(1 + rand() * 2)}" fill="none"/>`,
    );
  }
  return `<rect width="${w}" height="${h}" fill="${palette.pergament}"/>
<rect width="${w}" height="${h}" fill="url(#parchLight)"/>
${fibers.join("")}`;
}

const parchDefs = `<radialGradient id="parchLight" cx="0.4" cy="0.35" r="0.8"><stop offset="0" stop-color="#F6EFDD" stop-opacity="0.9"/><stop offset="1" stop-color="#D8C8A4" stop-opacity="0.6"/></radialGradient>`;

// ── 01 Deschiderea ────────────────────────────────────────────────────────────
const deschiderea: Composition = (c, mobile) => {
  const { w, h } = c;
  const defs = `
<linearGradient id="plaster" x1="0" y1="0" x2="1" y2="0.2"><stop offset="0" stop-color="#E7D3A8"/><stop offset="0.55" stop-color="#D2B783"/><stop offset="1" stop-color="#A9844F"/></linearGradient>
<radialGradient id="lightSpot" cx="0.22" cy="0.3" r="0.55"><stop offset="0" stop-color="#FFF4D8" stop-opacity="0.55"/><stop offset="1" stop-color="#FFF4D8" stop-opacity="0"/></radialGradient>
<linearGradient id="doublet" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#D2A24A"/><stop offset="0.6" stop-color="#B8862E"/><stop offset="1" stop-color="#7C5A1C"/></linearGradient>
<linearGradient id="skinShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E4BE98"/><stop offset="1" stop-color="#B98A63"/></linearGradient>`;
  // local figure box is 1000×1200; the ball sits at (405, 560) in local units
  const scale = mobile ? 1.02 : (h * 1.05) / 1200;
  const bx = mobile ? w * 0.47 : w * 0.64;
  const by = mobile ? h * 0.34 : h * 0.5;
  const tx = bx - 405 * scale;
  const ty = by - 560 * scale;
  const figure = `<g transform="translate(${r1(tx)} ${r1(ty)}) scale(${r1(scale * 1000) / 1000})">
  ${racquet(730, 1160, 900, 14)}
  <path d="M 470 540 C 400 560, 300 600, 250 700 L 190 1260 L 910 1260 L 870 700 C 830 610, 700 560, 610 540 Z" fill="url(#doublet)"/>
  <path d="M 520 600 L 540 1260 M 600 590 L 640 1260" stroke="#7C5A1C" stroke-opacity="0.35" stroke-width="6"/>
  <path d="M 465 540 C 520 575, 570 575, 615 540 L 622 568 C 570 604, 515 604, 458 568 Z" fill="${palette.in}"/>
  <path d="M 560 170 C 640 180, 680 260, 665 330 C 655 390, 620 420, 600 450 L 610 560 L 470 560 L 478 470 C 450 455, 440 430, 445 410 C 430 405, 425 392, 432 380 C 422 372, 420 360, 430 352 C 410 340, 400 322, 412 312 C 420 300, 425 290, 430 270 C 428 230, 470 175, 560 170 Z" fill="url(#skinShade)"/>
  <path d="M 452 222 C 474 160, 604 140, 662 222 C 690 282, 672 360, 642 402 C 622 332, 592 282, 522 252 C 492 242, 462 238, 452 222 Z" fill="#4A3322"/>
  <ellipse cx="560" cy="186" rx="158" ry="40" transform="rotate(-7 560 186)" fill="#5E2419"/>
  <ellipse cx="566" cy="160" rx="112" ry="46" fill="#6E2A1F"/>
  <path d="M 300 800 C 330 715, 362 662, 398 628 L 446 660 C 414 700, 386 752, 366 812 Z" fill="#9C7024"/>
  <ellipse cx="416" cy="614" rx="50" ry="38" fill="#D9AE86"/>
  <path d="M 380 600 C 392 575, 425 572, 452 590" stroke="#B98A63" stroke-width="8" fill="none" stroke-linecap="round"/>
</g>`;
  const ballR = (0.045 * w) / 2;
  const body = `<rect width="${w}" height="${h}" fill="url(#plaster)"/>
<rect width="${w}" height="${h}" fill="url(#lightSpot)"/>
<path d="M 0 ${r1(h * 0.83)} L ${w} ${r1(h * 0.8)} L ${w} ${h} L 0 ${h} Z" fill="#8E6B3E" opacity="0.28"/>
${figure}
${ball(bx, by, mobile ? ballR * 1.6 : ballR, { glow: true })}`;
  return svgDocument(c, defs, body);
};

// ── 02 Împreună ───────────────────────────────────────────────────────────────
const impreuna: Composition = (c, mobile) => {
  const { w, h } = c;
  const bx = w * 0.5;
  const by = mobile ? h * 0.34 : h * 0.42;
  const r = mobile ? w * 0.06 : (0.05 * w) / 2;
  const s = mobile ? 1.05 : 1;
  const arm = (side: -1 | 1, color: string, skin: string, dy: number) => {
    const edge = side === -1 ? -w * 0.02 : w * 1.02;
    const handX = bx + side * r * 1.25;
    const y = by + dy;
    const thick = (mobile ? w * 0.12 : h * 0.13) * s;
    const sleeveEnd = bx + side * (mobile ? w * 0.27 : w * 0.2);
    return `<path d="M ${r1(edge)} ${r1(y - thick * 0.6 + side * 30)} C ${r1((edge + sleeveEnd) / 2)} ${r1(y - thick * 0.55)}, ${r1(sleeveEnd)} ${r1(y - thick * 0.5)}, ${r1(sleeveEnd)} ${r1(y - thick * 0.42)} L ${r1(sleeveEnd)} ${r1(y + thick * 0.42)} C ${r1(sleeveEnd)} ${r1(y + thick * 0.5)}, ${r1((edge + sleeveEnd) / 2)} ${r1(y + thick * 0.6)}, ${r1(edge)} ${r1(y + thick * 0.7 + side * 30)} Z" fill="${color}"/>
<path d="M ${r1(sleeveEnd)} ${r1(y - thick * 0.32)} C ${r1(sleeveEnd - side * thick * 0.4)} ${r1(y - thick * 0.36)}, ${r1(handX + side * r * 0.2)} ${r1(y - thick * 0.3)}, ${r1(handX - side * r * 0.5)} ${r1(y - thick * 0.05)} C ${r1(handX - side * r * 0.75)} ${r1(y + thick * 0.08)}, ${r1(handX - side * r * 0.2)} ${r1(y + thick * 0.3)}, ${r1(handX + side * thick * 0.2)} ${r1(y + thick * 0.3)} L ${r1(sleeveEnd)} ${r1(y + thick * 0.32)} Z" fill="${skin}"/>
<path d="M ${r1(handX + side * thick * 0.05)} ${r1(y + thick * 0.12)} q ${r1(-side * r * 0.4)} ${r1(-thick * 0.05)} ${r1(-side * r * 0.9)} ${r1(-thick * 0.02)}" stroke="#000" stroke-opacity="0.15" stroke-width="${r1(thick * 0.03)}" fill="none" stroke-linecap="round"/>
<rect x="${r1(side === -1 ? sleeveEnd - thick * 0.16 : sleeveEnd)}" y="${r1(y - thick * 0.5)}" width="${r1(thick * 0.16)}" height="${r1(thick)}" fill="${palette.in}" opacity="0.85"/>`;
  };
  const body = `${parchmentBase(c, 2)}
<ellipse cx="${r1(bx)}" cy="${r1(by)}" rx="${r1(w * 0.42)}" ry="${r1(h * 0.28)}" fill="#FFF7E2" opacity="0.35" filter="url(#softer)"/>
${arm(-1, "#4E3524", "#B98A63", -r * 0.3)}
${arm(1, "#2E4E9E", "#E2BD97", r * 0.9)}
${ball(bx, by, r, { glow: true, shadow: false })}`;
  return svgDocument(c, parchDefs, body);
};

// ── 03 Cer (no ball: the site composes it from halftone dots) ─────────────────
const cer: Composition = (c, mobile) => {
  const { w, h } = c;
  const defs = sky("skyDeep", [
    [0, "#0F2F8F"],
    [0.45, palette.ultramarin],
    [1, "#5A83DA"],
  ]);
  const clouds = mobile
    ? [
        cloud(w * 0.2, h * 0.12, w * 0.5, 3),
        cloud(w * 0.85, h * 0.55, w * 0.55, 4, 0.9),
        cloud(w * 0.3, h * 0.82, w * 0.7, 5),
      ]
    : [
        cloud(w * 0.12, h * 0.16, w * 0.22, 3),
        cloud(w * 0.82, h * 0.2, w * 0.26, 4, 0.9),
        cloud(w * 0.36, h * 0.84, w * 0.3, 5),
        cloud(w * 0.9, h * 0.8, w * 0.2, 6, 0.85),
      ];
  const body = `<rect width="${w}" height="${h}" fill="url(#skyDeep)"/>${clouds.join("")}`;
  return svgDocument(c, defs, body);
};

// ── 04 Schele ─────────────────────────────────────────────────────────────────
const schele: Composition = (c, mobile) => {
  const { w, h } = c;
  const defs = sky("skyFresco", [
    [0, "#3E68CC"],
    [0.7, "#8EB3E8"],
    [1, "#C9D9EE"],
  ]);
  const bx = mobile ? w * 0.52 : w * 0.66;
  const by = mobile ? h * 0.33 : h * 0.46;
  const r = mobile ? w * 0.3 : (0.24 * w) / 2;
  const wood = palette.lemn;
  const poles: string[] = [];
  const cols = [-1.35, -0.7, 0, 0.7, 1.35];
  for (const k of cols) {
    const x = bx + k * r;
    poles.push(
      `<rect x="${r1(x - r * 0.025)}" y="${r1(by - r * 1.45)}" width="${r1(r * 0.05)}" height="${r1(h - (by - r * 1.45))}" fill="${wood}"/>`,
    );
  }
  const levels = [-1.05, -0.35, 0.35, 1.05];
  for (const lv of levels) {
    const y = by + lv * r;
    poles.push(
      `<rect x="${r1(bx - r * 1.45)}" y="${r1(y)}" width="${r1(r * 2.9)}" height="${r1(r * 0.05)}" fill="#8A6440"/>`,
    );
  }
  poles.push(
    `<path d="M ${r1(bx - r * 1.35)} ${r1(by + r * 1.05)} L ${r1(bx - r * 0.7)} ${r1(by + r * 0.35)} M ${r1(bx + r * 1.35)} ${r1(by + r * 1.05)} L ${r1(bx + r * 0.7)} ${r1(by + r * 0.35)} M ${r1(bx - r * 1.35)} ${r1(by - r * 0.35)} L ${r1(bx - r * 0.7)} ${r1(by - r * 1.05)}" stroke="${wood}" stroke-width="${r1(r * 0.035)}"/>`,
    `<path d="M ${r1(bx + r * 0.2)} ${r1(by - r * 1.6)} Q ${r1(bx + r * 0.1)} ${r1(by - r * 0.4)} ${r1(bx + r * 0.3)} ${r1(by + r * 0.6)}" stroke="#D8C8A0" stroke-width="${r1(r * 0.012)}" fill="none"/>`,
  );
  // ladder
  const lx = bx - r * 1.1;
  const ladder = `<g stroke="${wood}" stroke-width="${r1(r * 0.022)}"><line x1="${r1(lx)}" y1="${r1(h)}" x2="${r1(lx + r * 0.2)}" y2="${r1(by + r * 0.35)}"/><line x1="${r1(lx + r * 0.22)}" y1="${r1(h)}" x2="${r1(lx + r * 0.42)}" y2="${r1(by + r * 0.35)}"/>${Array.from(
    { length: 7 },
    (_, i) => {
      const t = (i + 1) / 8;
      const y = h - t * (h - by - r * 0.35);
      const x = lx + t * r * 0.2;
      return `<line x1="${r1(x)}" y1="${r1(y)}" x2="${r1(x + r * 0.22)}" y2="${r1(y)}"/>`;
    },
  ).join("")}</g>`;
  const workers = [
    person({
      x: bx - r * 1.05,
      y: by - r * 0.35,
      h: r * 0.42,
      robe: "#8C3B2A",
      pose: "reachUp",
      shortRobe: true,
    }),
    person({
      x: bx + r * 1.02,
      y: by + r * 0.35,
      h: r * 0.4,
      robe: "#3F5E8C",
      pose: "guide",
      facing: -1,
      shortRobe: true,
    }),
    person({
      x: bx + r * 0.25,
      y: by - r * 1.05,
      h: r * 0.38,
      robe: palette.in,
      pose: "reachUp",
      shortRobe: true,
    }),
    person({
      x: bx - r * 0.45,
      y: by + r * 1.05,
      h: r * 0.4,
      robe: "#6C5A2E",
      pose: "stand",
      shortRobe: true,
    }),
  ];
  const clouds = mobile
    ? [cloud(w * 0.2, h * 0.08, w * 0.4, 11)]
    : [cloud(w * 0.14, h * 0.2, w * 0.2, 11), cloud(w * 0.3, h * 0.7, w * 0.16, 12, 0.8)];
  const body = `<rect width="${w}" height="${h}" fill="url(#skyFresco)"/>${clouds.join("")}
${ball(bx, by, r, { glow: true })}
${poles.join("")}${ladder}${workers.join("")}`;
  return svgDocument(c, defs, body);
};

// ── 04b Pergament ─────────────────────────────────────────────────────────────
const pergament: Composition = (c, mobile) => {
  const { w, h } = c;
  const defs = `${sky("skyFresco2", [
    [0, "#3E68CC"],
    [0.75, "#9BBBE9"],
    [1, "#D2DEEE"],
  ])}${parchDefs}<linearGradient id="roll" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C9B78E"/><stop offset="0.5" stop-color="#F2E9D4"/><stop offset="1" stop-color="#B8A27A"/></linearGradient>`;
  const px = mobile ? w * 0.08 : w * 0.46;
  const pw = mobile ? w * 0.84 : w * 0.46;
  const py = mobile ? h * 0.12 : h * 0.16;
  const ph = mobile ? h * 0.46 : h * 0.66;
  const courtW = Math.min(pw * 0.8, ph * 0.9 * 2.17);
  const body = `<rect width="${w}" height="${h}" fill="url(#skyFresco2)"/>
${cloud(mobile ? w * 0.3 : w * 0.18, h * 0.12, mobile ? w * 0.5 : w * 0.2, 21)}
<g opacity="0.7"><rect x="${r1(px - pw * 0.08)}" y="0" width="${r1(pw * 0.02)}" height="${h}" fill="${palette.lemn}"/><rect x="${r1(px + pw * 1.06)}" y="0" width="${r1(pw * 0.02)}" height="${h}" fill="${palette.lemn}"/><rect x="${r1(px - pw * 0.1)}" y="${r1(py + ph * 1.08)}" width="${r1(pw * 1.2)}" height="${r1(pw * 0.02)}" fill="#8A6440"/></g>
<rect x="${r1(px)}" y="${r1(py)}" width="${r1(pw)}" height="${r1(ph)}" fill="${palette.pergament}"/>
<rect x="${r1(px)}" y="${r1(py)}" width="${r1(pw)}" height="${r1(ph)}" fill="url(#parchLight)" opacity="0.6"/>
${courtLines(px + pw / 2, py + ph / 2, courtW, palette.sepia, Math.max(3, w * 0.0016))}
<g stroke="${palette.sepia}" stroke-opacity="0.35" stroke-width="${r1(w * 0.0008)}" fill="none"><circle cx="${r1(px + pw / 2)}" cy="${r1(py + ph / 2)}" r="${r1(courtW * 0.12)}"/><line x1="${r1(px + pw * 0.05)}" y1="${r1(py + ph / 2)}" x2="${r1(px + pw * 0.95)}" y2="${r1(py + ph / 2)}" stroke-dasharray="12 10"/></g>
<rect x="${r1(px - pw * 0.035)}" y="${r1(py - ph * 0.02)}" width="${r1(pw * 0.05)}" height="${r1(ph * 1.04)}" rx="${r1(pw * 0.025)}" fill="url(#roll)"/>
<rect x="${r1(px + pw - pw * 0.015)}" y="${r1(py - ph * 0.02)}" width="${r1(pw * 0.05)}" height="${r1(ph * 1.04)}" rx="${r1(pw * 0.025)}" fill="url(#roll)"/>
${person({ x: mobile ? w * 0.22 : px - pw * 0.16, y: mobile ? h * 0.98 : h * 0.98, h: mobile ? h * 0.36 : h * 0.72, robe: palette.in, pose: "unroll", skin: "#D8AE88" })}`;
  return svgDocument(c, defs, body);
};

// ── Program paintings (4:5) ───────────────────────────────────────────────────
function courtyard(c: Canvas, floor: string, wall: string, arches = 0): string {
  const { w, h } = c;
  const archSvg = Array.from({ length: arches }, (_, i) => {
    const aw = w / arches;
    const x = i * aw + aw * 0.14;
    const ww = aw * 0.72;
    return `<path d="M ${r1(x)} ${r1(h * 0.6)} L ${r1(x)} ${r1(h * 0.28)} A ${r1(ww / 2)} ${r1(ww / 2)} 0 0 1 ${r1(x + ww)} ${r1(h * 0.28)} L ${r1(x + ww)} ${r1(h * 0.6)} Z" fill="#6E5A44" opacity="0.55"/>`;
  }).join("");
  return `<rect width="${w}" height="${h}" fill="${wall}"/><rect y="${r1(h * 0.6)}" width="${w}" height="${r1(h * 0.4)}" fill="${floor}"/>${archSvg}<rect y="${r1(h * 0.595)}" width="${w}" height="${r1(h * 0.012)}" fill="#000" opacity="0.12"/>`;
}

const programMini: Composition = (c) => {
  const { w, h } = c;
  const body = `${courtyard(c, "#B8683F", "#D9BE92")}
<ellipse cx="${r1(w * 0.5)}" cy="${r1(h * 0.92)}" rx="${r1(w * 0.3)}" ry="${r1(h * 0.02)}" fill="#000" opacity="0.15"/>
${person({ x: w * 0.44, y: h * 0.9, h: h * 0.42, robe: "#3F5E8C", pose: "swing", shortRobe: true, hair: "#8A5A2B" })}
${racquet(w * 0.62, h * 0.66, h * 0.2, 60)}
${ball(w * 0.68, h * 0.5, w * 0.035, { glow: true })}`;
  return svgDocument(c, "", body);
};

const programJuniori: Composition = (c) => {
  const { w, h } = c;
  const body = `${courtyard(c, "#A95A36", "#CDB48A")}
<path d="M ${r1(w * 0.1)} ${r1(h * 0.98)} L ${r1(w * 0.3)} ${r1(h * 0.62)} L ${r1(w * 0.7)} ${r1(h * 0.62)} L ${r1(w * 0.9)} ${r1(h * 0.98)} Z" fill="none" stroke="#F1E8D6" stroke-width="${r1(w * 0.006)}"/>
<line x1="${r1(w * 0.2)}" y1="${r1(h * 0.78)}" x2="${r1(w * 0.8)}" y2="${r1(h * 0.78)}" stroke="#F1E8D6" stroke-width="${r1(w * 0.008)}"/>
${person({ x: w * 0.26, y: h * 0.94, h: h * 0.34, robe: "#8C3B2A", pose: "swing", shortRobe: true })}
${person({ x: w * 0.74, y: h * 0.72, h: h * 0.22, robe: "#3F5E8C", pose: "swing", facing: -1, shortRobe: true })}
${ball(w * 0.52, h * 0.44, w * 0.03, { glow: true })}`;
  return svgDocument(c, "", body);
};

const programAdulti: Composition = (c) => {
  const { w, h } = c;
  const body = `${courtyard(c, "#B06440", "#D6BC8E", 3)}
${person({ x: w * 0.42, y: h * 0.95, h: h * 0.52, robe: "#6C5A2E", pose: "swing", shortRobe: true })}
${person({ x: w * 0.3, y: h * 0.93, h: h * 0.56, robe: palette.in, pose: "guide", hair: "#8A8278" })}
${racquet(w * 0.66, h * 0.62, h * 0.24, 70)}
${ball(w * 0.8, h * 0.5, w * 0.03, { glow: true })}`;
  return svgDocument(c, "", body);
};

const programPerformanta: Composition = (c) => {
  const { w, h } = c;
  const defs = sky("dramatic", [
    [0, "#1B2F6E"],
    [0.55, "#6B5F8E"],
    [0.85, "#D8A06A"],
    [1, "#E9C08A"],
  ]);
  const body = `<rect width="${w}" height="${h}" fill="url(#dramatic)"/>
${cloud(w * 0.2, h * 0.3, w * 0.5, 31, 0.5)}
<rect y="${r1(h * 0.86)}" width="${w}" height="${r1(h * 0.14)}" fill="#8E4A2B"/>
${person({ x: w * 0.48, y: h * 0.92, h: h * 0.6, robe: "#F0E8D6", pose: "serve", shortRobe: true })}
${racquet(w * 0.54, h * 0.4, h * 0.22, 20)}
${ball(w * 0.44, h * 0.16, w * 0.032, { glow: true })}`;
  return svgDocument(c, defs, body);
};

const programVideo: Composition = (c) => {
  const { w, h } = c;
  const frames = Array.from({ length: 6 }, (_, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = w * 0.2 + col * w * 0.21;
    const y = h * 0.14 + row * h * 0.16;
    const angle = -80 + i * 32;
    return `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w * 0.18)}" height="${r1(h * 0.13)}" fill="#F2E9D4"/><g transform="translate(${r1(x + w * 0.09)} ${r1(y + h * 0.1)})" stroke="${palette.sepia}" stroke-width="${r1(w * 0.004)}" fill="none"><circle cx="0" cy="${r1(-h * 0.07)}" r="${r1(w * 0.01)}"/><line x1="0" y1="${r1(-h * 0.06)}" x2="0" y2="${r1(-h * 0.02)}"/><line x1="0" y1="${r1(-h * 0.045)}" x2="${r1(Math.cos((angle * Math.PI) / 180) * w * 0.05)}" y2="${r1(-h * 0.045 + Math.sin((angle * Math.PI) / 180) * w * 0.05)}"/><line x1="0" y1="${r1(-h * 0.02)}" x2="${r1(-w * 0.015)}" y2="0"/><line x1="0" y1="${r1(-h * 0.02)}" x2="${r1(w * 0.015)}" y2="0"/></g>`;
  }).join("");
  const body = `${courtyard(c, "#9E6A45", "#CFB58C")}
<rect x="${r1(w * 0.16)}" y="${r1(h * 0.1)}" width="${r1(w * 0.71)}" height="${r1(h * 0.38)}" fill="#7A5634"/>
${frames}
${person({ x: w * 0.3, y: h * 0.96, h: h * 0.44, robe: palette.in, pose: "pointUp", hair: "#8A8278" })}
${person({ x: w * 0.66, y: h * 0.96, h: h * 0.4, robe: "#3F5E8C", pose: "stand", facing: -1 })}
${ball(w * 0.84, h * 0.62, w * 0.028, { glow: true })}`;
  return svgDocument(c, "", body);
};

const programTabere: Composition = (c) => {
  const { w, h } = c;
  const rand = rng(41);
  const canopy = Array.from({ length: 16 }, () => {
    const x = w * (0.1 + rand() * 0.8);
    const y = h * (0.05 + rand() * 0.28);
    const r = w * (0.1 + rand() * 0.1);
    return `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="${rand() > 0.5 ? palette.frunza : palette.frunzaDeschis}"/>`;
  }).join("");
  const basketBalls = Array.from({ length: 9 }, (_, i) =>
    ball(w * (0.64 + (i % 3) * 0.045), h * (0.8 - Math.floor(i / 3) * 0.03), w * 0.022),
  ).join("");
  const body = `<rect width="${w}" height="${h}" fill="#CFE0F5"/>
<rect y="${r1(h * 0.62)}" width="${w}" height="${r1(h * 0.38)}" fill="#A95A36"/>
<rect x="${r1(w * 0.46)}" y="${r1(h * 0.2)}" width="${r1(w * 0.06)}" height="${r1(h * 0.46)}" fill="#5B4028"/>
${canopy}
<ellipse cx="${r1(w * 0.45)}" cy="${r1(h * 0.72)}" rx="${r1(w * 0.45)}" ry="${r1(h * 0.08)}" fill="#1D1A15" opacity="0.22"/>
${person({ x: w * 0.22, y: h * 0.86, h: h * 0.2, robe: "#8C3B2A", pose: "sit" })}
${person({ x: w * 0.4, y: h * 0.84, h: h * 0.2, robe: "#3F5E8C", pose: "sit" })}
${basketBalls}
<path d="M ${r1(w * 0.6)} ${r1(h * 0.78)} L ${r1(w * 0.63)} ${r1(h * 0.88)} L ${r1(w * 0.77)} ${r1(h * 0.88)} L ${r1(w * 0.8)} ${r1(h * 0.78)} Z" fill="#C49A5A"/>
<path d="M ${r1(w * 0.61)} ${r1(h * 0.81)} L ${r1(w * 0.79)} ${r1(h * 0.81)} M ${r1(w * 0.62)} ${r1(h * 0.845)} L ${r1(w * 0.78)} ${r1(h * 0.845)}" stroke="#8E6B3E" stroke-width="${r1(w * 0.004)}"/>`;
  return svgDocument(c, "", body);
};

// ── 06 Schița terenului ───────────────────────────────────────────────────────
const courtGeometry = (c: Canvas, mobile: boolean) => {
  const length = mobile ? c.h * 0.7 : c.h * 0.8;
  return { cx: c.w / 2, cy: c.h / 2, length };
};

const schitaTeren: Composition = (c, mobile) => {
  const { w } = c;
  const { cx, cy, length } = courtGeometry(c, mobile);
  const ink = palette.sepia;
  const sw = Math.max(3, w * 0.0014);
  const width = (length * 10.97) / 23.77;
  const construction = `<g stroke="${ink}" stroke-opacity="0.3" stroke-width="${r1(sw * 0.5)}" fill="none" stroke-dasharray="${r1(sw * 5)} ${r1(sw * 4)}">
<line x1="${r1(cx - width * 1.2)}" y1="${r1(cy - length / 2)}" x2="${r1(cx + width * 1.2)}" y2="${r1(cy - length / 2)}"/>
<line x1="${r1(cx - width * 1.2)}" y1="${r1(cy + length / 2)}" x2="${r1(cx + width * 1.2)}" y2="${r1(cy + length / 2)}"/>
<line x1="${r1(cx - width / 2)}" y1="${r1(cy - length * 0.62)}" x2="${r1(cx - width / 2)}" y2="${r1(cy + length * 0.62)}"/>
<line x1="${r1(cx + width / 2)}" y1="${r1(cy - length * 0.62)}" x2="${r1(cx + width / 2)}" y2="${r1(cy + length * 0.62)}"/>
<line x1="${r1(cx - width / 2)}" y1="${r1(cy - length / 2)}" x2="${r1(cx + width / 2)}" y2="${r1(cy + length / 2)}"/>
<line x1="${r1(cx + width / 2)}" y1="${r1(cy - length / 2)}" x2="${r1(cx - width / 2)}" y2="${r1(cy + length / 2)}"/>
<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(length * 0.33)}"/>
<path d="M ${r1(cx - width * 0.9)} ${r1(cy - length * 0.3)} A ${r1(length * 0.2)} ${r1(length * 0.2)} 0 0 1 ${r1(cx - width * 0.9)} ${r1(cy + length * 0.1)}"/>
</g>`;
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const y = cy - length / 2 + (i * length) / 11;
    return `<line x1="${r1(cx + width * 0.62)}" y1="${r1(y)}" x2="${r1(cx + width * 0.68)}" y2="${r1(y)}"/>`;
  }).join("");
  const workers = [
    person({
      x: cx - width * 0.85,
      y: cy + length * 0.46,
      h: length * 0.07,
      robe: "#7A5634",
      pose: "reachUp",
      shortRobe: true,
      skin: "#B98A63",
    }),
    person({
      x: cx + width * 0.82,
      y: cy - length * 0.3,
      h: length * 0.065,
      robe: "#6B4A2B",
      pose: "guide",
      facing: -1,
      shortRobe: true,
      skin: "#B98A63",
    }),
  ].map((p) => `<g opacity="0.75">${p}</g>`);
  const body = `${parchmentBase(c, 6)}
${construction}
<g stroke="${ink}" stroke-opacity="0.5" stroke-width="${r1(sw * 0.6)}">${ticks}</g>
${courtLines(cx, cy, length, ink, sw, "", true)}
<g fill="${ink}" opacity="0.55" font-family="serif" font-size="${r1(length * 0.022)}" font-style="italic"><circle cx="${r1(cx - width * 0.95)}" cy="${r1(cy - length * 0.45)}" r="${r1(length * 0.006)}"/></g>
${workers.join("")}`;
  return svgDocument(c, parchDefs, body);
};

// ── 06b Mozaic ────────────────────────────────────────────────────────────────
const mozaic: Composition = (c, mobile) => {
  const { w, h } = c;
  const { cx, cy, length } = courtGeometry(c, mobile);
  const width = (length * 10.97) / 23.77;
  const margin = length * 0.12;
  const clayX = cx - width / 2 - margin * 0.9;
  const clayY = cy - length / 2 - margin;
  const clayW = width + margin * 1.8;
  const clayH = length + margin * 2;
  const border = length * 0.05;
  const rand = rng(61);
  const tiles: string[] = [];
  const tile = length * 0.028;
  for (let y = 0; y < h; y += tile) {
    for (let x = 0; x < w; x += tile) {
      const inside =
        x > clayX - border * 2 &&
        x < clayX + clayW + border * 2 &&
        y > clayY - border * 2 &&
        y < clayY + clayH + border * 2;
      if (inside) continue;
      const shade = rand();
      const fill = shade > 0.9 ? "#D9CDB2" : shade > 0.6 ? "#E9E0CB" : "#F1EADB";
      tiles.push(
        `<rect x="${r1(x + 1)}" y="${r1(y + 1)}" width="${r1(tile - 2)}" height="${r1(tile - 2)}" fill="${fill}"/>`,
      );
    }
  }
  const meander = (x: number, y: number, ww: number, hh: number) => {
    const step = border * 0.8;
    const items: string[] = [];
    for (let t = 0; t < ww; t += step * 2) {
      items.push(
        `<rect x="${r1(x + t)}" y="${r1(y)}" width="${r1(step)}" height="${r1(border * 0.5)}" fill="#6E5214"/>`,
      );
      items.push(
        `<rect x="${r1(x + t)}" y="${r1(y + hh - border * 0.5)}" width="${r1(step)}" height="${r1(border * 0.5)}" fill="#6E5214"/>`,
      );
    }
    for (let t = 0; t < hh; t += step * 2) {
      items.push(
        `<rect x="${r1(x)}" y="${r1(y + t)}" width="${r1(border * 0.5)}" height="${r1(step)}" fill="#6E5214"/>`,
      );
      items.push(
        `<rect x="${r1(x + ww - border * 0.5)}" y="${r1(y + t)}" width="${r1(border * 0.5)}" height="${r1(step)}" fill="#6E5214"/>`,
      );
    }
    return items.join("");
  };
  const defs = `<linearGradient id="clay" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#B8663E"/><stop offset="1" stop-color="#9E4A28"/></linearGradient>`;
  const body = `<rect width="${w}" height="${h}" fill="#E4D9C2"/>
${tiles.join("")}
<rect x="${r1(clayX - border * 2)}" y="${r1(clayY - border * 2)}" width="${r1(clayW + border * 4)}" height="${r1(clayH + border * 4)}" fill="#C9A13B"/>
${meander(clayX - border * 2, clayY - border * 2, clayW + border * 4, clayH + border * 4)}
<rect x="${r1(clayX - border * 0.6)}" y="${r1(clayY - border * 0.6)}" width="${r1(clayW + border * 1.2)}" height="${r1(clayH + border * 1.2)}" fill="#EFE6D2"/>
<rect x="${r1(clayX)}" y="${r1(clayY)}" width="${r1(clayW)}" height="${r1(clayH)}" fill="url(#clay)"/>
${courtLines(cx, cy, length, "#F1E8D6", Math.max(4, length * 0.006), "", true)}
${ball(cx, cy, (0.022 * (mobile ? w * 1.8 : w)) / 2, { glow: true, shadow: true })}`;
  return svgDocument(c, defs, body);
};

// ── 08 Pom ────────────────────────────────────────────────────────────────────
const pom: Composition = (c, mobile) => {
  const { w, h } = c;
  const defs = `${sky("skyPale", [
    [0, "#6F99DD"],
    [1, "#D3E3F5"],
  ])}<linearGradient id="urn" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C77A4E"/><stop offset="1" stop-color="#8E4A2B"/></linearGradient>`;
  const tx = mobile ? w * 0.6 : w * 0.72;
  const ty = mobile ? h * 0.3 : h * 0.3;
  const scale = mobile ? w * 0.9 : w * 0.36;
  const rand = rng(81);
  const leaves = Array.from({ length: 22 }, () => {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * scale * 0.33;
    const r = scale * (0.06 + rand() * 0.06);
    return `<circle cx="${r1(tx + Math.cos(a) * d * 1.2)}" cy="${r1(ty + Math.sin(a) * d * 0.8)}" r="${r1(r)}" fill="${rand() > 0.5 ? palette.frunza : palette.frunzaDeschis}"/>`;
  }).join("");
  const fruits = Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2 + 0.4;
    const d = scale * (0.16 + (i % 2) * 0.1);
    return ball(tx + Math.cos(a) * d * 1.1, ty + Math.sin(a) * d * 0.7, scale * 0.034);
  }).join("");
  const urnTop = ty + scale * 0.62;
  const body = `<rect width="${w}" height="${h}" fill="url(#skyPale)"/>
${mobile ? cloud(w * 0.25, h * 0.1, w * 0.5, 82) : `${cloud(w * 0.15, h * 0.18, w * 0.22, 82)}${cloud(w * 0.35, h * 0.72, w * 0.16, 83, 0.8)}`}
<rect x="${r1(tx - scale * 0.03)}" y="${r1(ty)}" width="${r1(scale * 0.06)}" height="${r1(urnTop - ty + scale * 0.02)}" fill="#5B4028"/>
${leaves}${fruits}
${ball(w * 0.72, h * 0.3, (0.03 * w) / 2)}
<path d="M ${r1(tx - scale * 0.2)} ${r1(urnTop)} L ${r1(tx + scale * 0.2)} ${r1(urnTop)} C ${r1(tx + scale * 0.26)} ${r1(urnTop + scale * 0.2)}, ${r1(tx + scale * 0.16)} ${r1(urnTop + scale * 0.42)}, ${r1(tx + scale * 0.1)} ${r1(urnTop + scale * 0.46)} L ${r1(tx - scale * 0.1)} ${r1(urnTop + scale * 0.46)} C ${r1(tx - scale * 0.16)} ${r1(urnTop + scale * 0.42)}, ${r1(tx - scale * 0.26)} ${r1(urnTop + scale * 0.2)}, ${r1(tx - scale * 0.2)} ${r1(urnTop)} Z" fill="url(#urn)"/>
<rect y="${r1(urnTop + scale * 0.46)}" width="${w}" height="${h}" fill="#C8B28A"/>
${person({ x: tx - scale * 0.36, y: urnTop + scale * 0.47, h: scale * 0.95, robe: "#AFC6E3", pose: "reachUp", hair: "#6B4A2B" })}`;
  return svgDocument(c, defs, body);
};

// ── 09 Curcubeu ───────────────────────────────────────────────────────────────
const curcubeu: Composition = (c, mobile) => {
  const { w, h } = c;
  const defs = sky("skyRain", [
    [0, "#A9C6EC"],
    [1, "#EEF2F3"],
  ]);
  const cx = w / 2;
  const cy = mobile ? h * 0.62 : h * 1.02;
  const radius = mobile ? w * 0.62 : w * 0.4;
  const colors = ["#C65B4E", "#D99A4E", "#E3CB6B", "#86A96A", "#5D86B8", "#6E5E9E"];
  const band = radius * 0.035;
  const arcs = colors
    .map((color, i) => {
      const rr = radius - i * band;
      return `<path d="M ${r1(cx - rr)} ${r1(cy)} A ${r1(rr)} ${r1(rr)} 0 0 1 ${r1(cx + rr)} ${r1(cy)}" stroke="${color}" stroke-width="${r1(band)}" fill="none"/>`;
    })
    .join("");
  const body = `<rect width="${w}" height="${h}" fill="url(#skyRain)"/>
${cloud(w * 0.15, h * 0.85, w * 0.3, 91, 0.9)}${cloud(w * 0.85, h * 0.9, w * 0.34, 92, 0.9)}
<g opacity="0.55" filter="url(#blurS)">${arcs}</g>
${ball(w * 0.5, mobile ? h * 0.36 : h * 0.42, mobile ? w * 0.07 : (0.05 * w) / 2, { glow: true })}`;
  return svgDocument(c, defs, body);
};

const ramuri: Composition = (c, mobile) => {
  const { w, h } = c;
  const rand = rng(95);
  const leafs: string[] = [];
  const clearing = {
    x: w / 2,
    y: h / 2,
    rx: mobile ? w * 0.42 : w * 0.26,
    ry: mobile ? h * 0.3 : h * 0.36,
  };
  for (let i = 0; i < 520; i += 1) {
    const x = rand() * w;
    const y = rand() * h;
    const dx = (x - clearing.x) / clearing.rx;
    const dy = (y - clearing.y) / clearing.ry;
    if (dx * dx + dy * dy < 1) continue;
    const r = w * (0.012 + rand() * 0.014);
    const angle = rand() * 180;
    leafs.push(
      `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(r * 1.8)}" ry="${r1(r * 0.8)}" transform="rotate(${r1(angle)} ${r1(x)} ${r1(y)})" fill="${rand() > 0.55 ? palette.frunza : rand() > 0.5 ? palette.frunzaDeschis : "#3E5530"}"/>`,
    );
  }
  const branches = Array.from({ length: 10 }, (_, i) => {
    const fromLeft = i % 2 === 0;
    const y = h * (0.05 + (i / 10) * 0.9);
    const x0 = fromLeft ? -w * 0.02 : w * 1.02;
    const x1 = fromLeft ? w * (0.2 + rand() * 0.12) : w * (0.8 - rand() * 0.12);
    return `<path d="M ${r1(x0)} ${r1(y)} Q ${r1((x0 + x1) / 2)} ${r1(y - h * 0.06)} ${r1(x1)} ${r1(y + h * 0.02)}" stroke="#4A3322" stroke-width="${r1(w * 0.007)}" fill="none" stroke-linecap="round"/>`;
  }).join("");
  const balls: string[] = [];
  for (let i = 0; i < 26; i += 1) {
    const x = rand() * w;
    const y = rand() * h;
    const dx = (x - clearing.x) / (clearing.rx * 1.15);
    const dy = (y - clearing.y) / (clearing.ry * 1.15);
    if (dx * dx + dy * dy < 1) continue;
    balls.push(ball(x, y, w * (mobile ? 0.03 : 0.013)));
  }
  const body = `<rect width="${w}" height="${h}" fill="#B9D0EE"/>${branches}${leafs.join("")}${balls.join("")}`;
  return svgDocument(c, "", body);
};

// ── 10 Constelația ────────────────────────────────────────────────────────────
const constelatie: Composition = (c, mobile) => {
  const { w, h } = c;
  const defs = sky("night", [
    [0, "#060F2E"],
    [0.6, palette.noapte],
    [1, "#1C3A8E"],
  ]);
  const pts = mobile
    ? [
        [0.12, 0.5],
        [0.26, 0.3],
        [0.44, 0.19],
        [0.62, 0.22],
        [0.8, 0.34],
        [0.9, 0.46],
      ]
    : [
        [0.1, 0.62],
        [0.2, 0.4],
        [0.31, 0.28],
        [0.42, 0.26],
        [0.52, 0.31],
        [0.6, 0.44],
      ];
  const P = pts.map(([x, y]) => [x! * w, y! * h] as const);
  const lines = P.slice(1)
    .map(
      ([x, y], i) =>
        `<line x1="${r1(P[i]![0])}" y1="${r1(P[i]![1])}" x2="${r1(x)}" y2="${r1(y)}"/>`,
    )
    .join("");
  const court = mobile
    ? { x: w * 0.2, y: h * 0.56, ww: w * 0.6, hh: h * 0.06 }
    : { x: w * 0.12, y: h * 0.66, ww: w * 0.46, hh: h * 0.08 };
  const courtStars = [
    [court.x, court.y + court.hh],
    [court.x + court.ww * 0.12, court.y],
    [court.x + court.ww * 0.88, court.y],
    [court.x + court.ww, court.y + court.hh],
    [court.x + court.ww * 0.5, court.y - court.hh * 0.1],
    [court.x + court.ww * 0.5, court.y + court.hh * 1.1],
  ];
  const courtPath = `<path d="M ${r1(courtStars[0]![0]!)} ${r1(courtStars[0]![1]!)} L ${r1(courtStars[1]![0]!)} ${r1(courtStars[1]![1]!)} L ${r1(courtStars[2]![0]!)} ${r1(courtStars[2]![1]!)} L ${r1(courtStars[3]![0]!)} ${r1(courtStars[3]![1]!)} Z M ${r1(courtStars[4]![0]!)} ${r1(courtStars[4]![1]!)} L ${r1(courtStars[5]![0]!)} ${r1(courtStars[5]![1]!)}"/>`;
  const starDots = [...P, ...courtStars]
    .map(
      ([x, y]) =>
        `<circle cx="${r1(x!)}" cy="${r1(y!)}" r="${r1(w * 0.003)}" fill="#FFF6DD"/><circle cx="${r1(x!)}" cy="${r1(y!)}" r="${r1(w * 0.012)}" fill="url(#ballGlow)" opacity="0.6"/>`,
    )
    .join("");
  const apex = P[3]!;
  const body = `<rect width="${w}" height="${h}" fill="url(#night)"/>
${stars(c, mobile ? 160 : 260, 101, 0.85)}
<g stroke="#E8E1CB" stroke-opacity="0.45" stroke-width="${r1(w * 0.0012)}" fill="none">${lines}${courtPath}</g>
${starDots}
${ball(apex[0], apex[1], mobile ? w * 0.022 : (0.018 * w) / 2, { glow: true })}
<ellipse cx="${r1(w * 0.5)}" cy="${r1(h * 1.05)}" rx="${r1(w * 0.8)}" ry="${r1(h * 0.14)}" fill="#050B22"/>
${person({ x: mobile ? w * 0.18 : w * 0.08, y: h * 1.02, h: mobile ? h * 0.36 : h * 0.62, robe: "#E8E4DA", pose: "pointUp", skin: "#C9A27E", hair: "#3A2A1C" })}`;
  return svgDocument(c, defs, body);
};

// ── Texture & clouds ──────────────────────────────────────────────────────────
const texturaPergament: Composition = (c) => svgDocument(c, parchDefs, parchmentBase(c, 17));

const makeCloud =
  (seed: number): Composition =>
  (c) => {
    const { w, h } = c;
    return svgDocument(c, "", cloud(w / 2, h * 0.58, w * 0.8, seed, 1), false);
  };

export const compositions: Record<
  string,
  { composition: Composition; kind: "scene" | "program" | "texture" | "cloud" }
> = {
  "01-deschiderea": { composition: deschiderea, kind: "scene" },
  "02-impreuna": { composition: impreuna, kind: "scene" },
  "03-cer": { composition: cer, kind: "scene" },
  "04-schele": { composition: schele, kind: "scene" },
  "04b-pergament": { composition: pergament, kind: "scene" },
  "05-program-mini-tenis": { composition: programMini, kind: "program" },
  "05-program-juniori": { composition: programJuniori, kind: "program" },
  "05-program-adulti": { composition: programAdulti, kind: "program" },
  "05-program-performanta": { composition: programPerformanta, kind: "program" },
  "05-program-video": { composition: programVideo, kind: "program" },
  "05-program-tabere": { composition: programTabere, kind: "program" },
  "06-schita-teren": { composition: schitaTeren, kind: "scene" },
  "06b-mozaic": { composition: mozaic, kind: "scene" },
  "08-pom": { composition: pom, kind: "scene" },
  "09-curcubeu": { composition: curcubeu, kind: "scene" },
  "09b-ramuri": { composition: ramuri, kind: "scene" },
  "10-constelatie": { composition: constelatie, kind: "scene" },
  "textura-pergament": { composition: texturaPergament, kind: "texture" },
  "nor-01": { composition: makeCloud(201), kind: "cloud" },
  "nor-02": { composition: makeCloud(202), kind: "cloud" },
  "nor-03": { composition: makeCloud(203), kind: "cloud" },
  "nor-04": { composition: makeCloud(204), kind: "cloud" },
  "nor-05": { composition: makeCloud(205), kind: "cloud" },
};
