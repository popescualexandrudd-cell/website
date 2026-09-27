/** Inline SVG icons (no icon font, no third-party requests). */
type P = { size?: number };
const base = (size: number) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, focusable: false });

export const IconRacket = ({ size = 30 }: P) => (
  <svg {...base(size)}><ellipse cx="10" cy="9" rx="6" ry="7" /><path d="M14 14l6 6M8 7h.01M11 7h.01M9.5 10h.01M8 12h.01M11 12h.01" /></svg>
);
export const IconTrophy = ({ size = 30 }: P) => (
  <svg {...base(size)}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4" /></svg>
);
export const IconLotus = ({ size = 30 }: P) => (
  <svg {...base(size)}><path d="M12 20c-4 0-8-2-9-6 3-1 6 0 9 2 3-2 6-3 9-2-1 4-5 6-9 6zM12 16c-2-3-2-7 0-11 2 4 2 8 0 11z" /></svg>
);
export const IconCoffee = ({ size = 30 }: P) => (
  <svg {...base(size)}><path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9zM17 11h1a3 3 0 0 1 0 6h-1M8 3v3M12 3v3" /></svg>
);
export const IconMusic = ({ size = 30 }: P) => (
  <svg {...base(size)}><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></svg>
);
export const IconParty = ({ size = 30 }: P) => (
  <svg {...base(size)}><path d="M3 21l6-15 9 9-15 6zM14 3v2M19 5l-1.5 1.5M21 10h-2M15 8l1-1" /></svg>
);
export const IconPin = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></svg>
);
export const IconRoute = ({ size = 20 }: P) => (
  <svg {...base(size)}><circle cx="6" cy="19" r="3" /><circle cx="18" cy="5" r="3" /><path d="M9 19h7a4 4 0 0 0 0-8H8a4 4 0 0 1 0-8h7" /></svg>
);
export const IconCar = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M5 17h14M6 17v2M18 17v2M4 13l2-6h12l2 6v4H4v-4zM7 13h.01M17 13h.01" /></svg>
);
export const IconCheck = ({ size = 44 }: P) => (
  <svg {...base(size)} strokeWidth={3}><path d="M5 12l5 5L20 7" /></svg>
);
export const IconCrown = ({ size = 40 }: P) => (
  <svg {...base(size)}><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z" /></svg>
);
export const IconStar = ({ size = 40 }: P) => (
  <svg {...base(size)}><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z" /></svg>
);
