/**
 * The site's effects (ADR-0023): which level of motion a visitor gets. Everything a visitor sees is
 * rendered on the server with `data-reveal` attributes; the CSS hides an element before it appears
 * only under `html[data-motion="on"|"lite"]`, which the effects runtime sets. Without JavaScript,
 * with the `web_effects` switch off, or under "reduced motion", nothing is ever hidden.
 */

export type MotionLevel = "on" | "lite" | "reduced";

export type Device = {
  reducedMotion: boolean;
  saveData?: boolean;
  effectiveType?: string;
  cores?: number;
  memoryGb?: number;
};

/**
 * "reduced" when the visitor asked for less motion (nothing hidden, nothing moving); "lite" on a
 * weak phone or a slow or metered connection (fades only: no 3D, no parallax, no pinned scenes);
 * otherwise the full effects.
 */
export function motionLevel(device: Device): MotionLevel {
  if (device.reducedMotion) return "reduced";
  const slow = device.saveData === true || /(^|-)(2g|3g)$/.test(device.effectiveType ?? "");
  const weak = (device.cores ?? 8) <= 4 || (device.memoryGb ?? 8) <= 4;
  return slow || weak ? "lite" : "on";
}

/** This browser, as `motionLevel` needs it. */
export function currentDevice(): Device {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string }; deviceMemory?: number };
  return {
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: nav.connection?.saveData,
    effectiveType: nav.connection?.effectiveType,
    cores: nav.hardwareConcurrency,
    memoryGb: nav.deviceMemory,
  };
}
