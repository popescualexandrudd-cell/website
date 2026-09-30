/**
 * Shared rules for the 3D scenes (CLAUDE.md, website conventions):
 * - start only after the page has loaded and the browser is idle (text and LCP first);
 * - only on a real GPU (software WebGL makes the page sluggish), unless `?3d=force` (demos);
 * - render on demand, at most 30 fps on phones, never while off-screen;
 * - a single still frame under `prefers-reduced-motion`.
 * Without WebGL the static render (an <img> with alt text) stays visible.
 */
import type { WebGLRenderer } from "three";

export type SceneFlags = { forced: boolean; capture: boolean; reduced: boolean; small: boolean };

export function sceneFlags(): SceneFlags {
  const mode = new URLSearchParams(window.location.search).get("3d");
  return {
    forced: mode === "force" || mode === "capture",
    capture: mode === "capture", // scripts/render-stills.mjs: keeps the drawing buffer for toDataURL()
    reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    small: window.innerWidth < 720,
  };
}

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|software|softpipe/i;

/**
 * True when WebGL is available on a real GPU. Checked on a throw-away context BEFORE downloading
 * three.js, so devices that will not show the scene never pay for parsing ~600 KB of JavaScript.
 */
export function hasRealGpu(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const name = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return !SOFTWARE_RENDERER.test(name);
  } catch {
    return false;
  }
}

/** How long the GPU check off the main thread may take before the page gives up on the scene. */
export const PROBE_TIMEOUT_MS = 4000;

/**
 * The same check, off the page's main thread where the browser can (a Web Worker with an
 * OffscreenCanvas, `public/gpu-probe.js`): creating the WebGL context no longer holds up a phone
 * right after the page loads. Where the worker cannot create a context, the check runs here.
 */
export function realGpu(): Promise<boolean> {
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") return Promise.resolve(hasRealGpu());
  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker("/gpu-probe.js");
    } catch {
      resolve(hasRealGpu());
      return;
    }
    const done = (answer: boolean) => {
      window.clearTimeout(timer);
      worker.terminate();
      resolve(answer);
    };
    const timer = window.setTimeout(() => done(false), PROBE_TIMEOUT_MS);
    worker.onmessage = (event: MessageEvent<string>) => done(event.data ? !SOFTWARE_RENDERER.test(event.data) : hasRealGpu());
    worker.onerror = () => done(hasRealGpu());
    worker.postMessage("probe");
  });
}

/** Same check on an existing renderer (a second guard, e.g. when the GPU process fell back to software). */
export function usesSoftwareRendering(renderer: WebGLRenderer): boolean {
  const gl = renderer.getContext();
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const name = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  return SOFTWARE_RENDERER.test(name);
}

/** Runs `fn` after `load`, when the main thread is idle. Returns a cancel function. */
export function afterLoadIdle(fn: () => void): () => void {
  let cancelled = false;
  let idle = 0;
  const run = () => {
    if (cancelled) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) idle = w.requestIdleCallback(() => !cancelled && fn(), { timeout: 2500 });
    else idle = window.setTimeout(() => !cancelled && fn(), 200);
  };
  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener("load", run);
    const w = window as Window & { cancelIdleCallback?: (id: number) => void };
    if (w.cancelIdleCallback) w.cancelIdleCallback(idle);
    window.clearTimeout(idle);
  };
}

/**
 * On-demand render loop. `step(dt)` returns true while it still needs frames (e.g. easing);
 * `invalidate()` asks for one more frame. Paused while the host is off-screen or the tab is hidden.
 */
export function createLoop(host: Element, small: boolean, step: (dt: number) => boolean) {
  const minFrameMs = small ? 1000 / 30 : 0;
  let raf = 0;
  let last = 0;
  let visible = true;
  let pending = true;

  const frame = (now: number) => {
    raf = 0;
    if (!visible || document.hidden) return;
    if (minFrameMs && now - last < minFrameMs - 1) {
      raf = requestAnimationFrame(frame);
      return;
    }
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
    last = now;
    pending = false;
    if (step(dt) || pending) raf = requestAnimationFrame(frame);
    else last = 0;
  };
  const invalidate = () => {
    pending = true;
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  };
  const io = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    if (visible) invalidate();
  });
  io.observe(host);
  const onVisibility = () => !document.hidden && invalidate();
  document.addEventListener("visibilitychange", onVisibility);
  invalidate();
  return {
    invalidate,
    stop() {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      if (raf) cancelAnimationFrame(raf);
    },
  };
}

/** Frees every GPU resource of a scene graph (geometries, materials, textures). */
export function disposeScene(root: import("three").Object3D): void {
  root.traverse((node) => {
    const mesh = node as import("three").Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value && typeof value === "object" && "isTexture" in value) (value as import("three").Texture).dispose();
      }
      material.dispose();
    }
  });
}
