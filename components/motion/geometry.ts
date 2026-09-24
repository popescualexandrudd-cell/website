/**
 * Pure geometry for the home page choreography: where a point of a painting lands on screen
 * when the painting is drawn with `object-fit: cover`, and how the travelling ball moves
 * between two such points. No DOM access, so it is unit-tested (tests/unit/geometry.test.ts).
 */

export type Point = { x: number; y: number };
export type BallState = { x: number; y: number; size: number; opacity: number };
export type LayerTransform = {
  scale: number;
  originX: number;
  originY: number;
  translateX: number;
  translateY: number;
};

export const IDENTITY: LayerTransform = {
  scale: 1,
  originX: 0,
  originY: 0,
  translateX: 0,
  translateY: 0,
};

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Maps t from [start, end] to [0, 1], clamped. */
export function segment(t: number, start: number, end: number): number {
  if (end <= start) return t >= end ? 1 : 0;
  return clamp((t - start) / (end - start));
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Screen position and diameter of a point on a painting of aspect `imageAspect` drawn with
 * object-fit: cover (centred) in a viewport of `width × height`. `fx`, `fy` are fractions of the
 * painting; `fsize` is the ball diameter as a fraction of the painting's width.
 */
export function coverPoint(
  fx: number,
  fy: number,
  fsize: number,
  width: number,
  height: number,
  imageAspect: number,
): { x: number; y: number; size: number } {
  const viewportAspect = width / height;
  let drawnWidth: number;
  let drawnHeight: number;
  if (viewportAspect > imageAspect) {
    drawnWidth = width;
    drawnHeight = width / imageAspect;
  } else {
    drawnHeight = height;
    drawnWidth = height * imageAspect;
  }
  const offsetX = (width - drawnWidth) / 2;
  const offsetY = (height - drawnHeight) / 2;
  return { x: offsetX + fx * drawnWidth, y: offsetY + fy * drawnHeight, size: fsize * drawnWidth };
}

/** Applies a layer's CSS transform (translate, then scale around an origin) to a point. */
export function transformPoint(point: { x: number; y: number; size: number }, t: LayerTransform) {
  return {
    x: t.originX + (point.x - t.originX) * t.scale + t.translateX,
    y: t.originY + (point.y - t.originY) * t.scale + t.translateY,
    size: point.size * t.scale,
  };
}

/** Travel from a to b along a gentle arc (control point lifted above the midpoint). */
export function arcBetween(a: BallState, b: BallState, t: number, lift = 0.18): BallState {
  const e = easeInOut(clamp(t));
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2 - Math.hypot(b.x - a.x, b.y - a.y) * lift;
  const x = (1 - e) * (1 - e) * a.x + 2 * (1 - e) * e * mx + e * e * b.x;
  const y = (1 - e) * (1 - e) * a.y + 2 * (1 - e) * e * my + e * e * b.y;
  return { x, y, size: lerp(a.size, b.size, e), opacity: lerp(a.opacity, b.opacity, e) };
}

/** Hop between consecutive anchors: returns the ball on a small parabola for a 0..n-1 progress. */
export function hopAlong(anchors: BallState[], progress: number, height = 0.12): BallState {
  if (anchors.length === 0) return { x: 0, y: 0, size: 0, opacity: 0 };
  const first = anchors[0] as BallState;
  if (anchors.length === 1) return first;
  const scaled = clamp(progress) * (anchors.length - 1);
  const index = Math.min(anchors.length - 2, Math.floor(scaled));
  const local = scaled - index;
  const a = anchors[index] as BallState;
  const b = anchors[index + 1] as BallState;
  const e = easeInOut(local);
  const jump = Math.sin(Math.PI * e) * Math.hypot(b.x - a.x, b.y - a.y) * height;
  return {
    x: lerp(a.x, b.x, e),
    y: lerp(a.y, b.y, e) - jump,
    size: lerp(a.size, b.size, e),
    opacity: lerp(a.opacity, b.opacity, e),
  };
}

/** Transform-origin (in px) so that zooming a layer moves the camera towards `point`. */
export function zoomTowards(point: Point, scale: number): LayerTransform {
  return { scale, originX: point.x, originY: point.y, translateX: 0, translateY: 0 };
}

export function transformToCss(t: LayerTransform): { transform: string; transformOrigin: string } {
  return {
    transform: `translate3d(${t.translateX.toFixed(2)}px, ${t.translateY.toFixed(2)}px, 0) scale(${t.scale.toFixed(4)})`,
    transformOrigin: `${t.originX.toFixed(1)}px ${t.originY.toFixed(1)}px`,
  };
}
