/** Renderer names of software rasterisers: WebGL works there, but every frame costs the CPU. */
const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i;

/** Whether this browser should get the 3D scene, and at what detail. */
export function webglSupport(): { ok: boolean; detail: "high" | "low"; reducedMotion: boolean } {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return { ok: false, detail: "low", reducedMotion };
  let ok = false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    if (gl) {
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
      ok = !SOFTWARE.test(renderer);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    ok = false;
  }
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency || 4;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const detail = coarse || memory <= 4 || cores <= 4 || window.innerWidth < 900 ? "low" : "high";
  return { ok, detail, reducedMotion };
}

/**
 * Resolves when the page has settled: after the load event and an idle moment, a short pause
 * later, or as soon as the visitor interacts, whichever comes first. The 3D scene never
 * competes with the first paint or the page's own scripts.
 */
export function whenSettled(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const events = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"];
    const finish = () => {
      if (done) return;
      done = true;
      for (const e of events) window.removeEventListener(e, finish);
      resolve();
    };
    for (const e of events) window.addEventListener(e, finish, { once: true, passive: true });
    const idle = () => {
      const later = () => setTimeout(finish, 1200);
      if ("requestIdleCallback" in window) window.requestIdleCallback(later, { timeout: 2500 });
      else setTimeout(later, 600);
    };
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });
  });
}
