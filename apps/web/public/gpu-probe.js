// The GPU check of the 3D scenes (src/lib/webgl.ts), off the page's main thread: creating a WebGL
// context can take a phone a few hundred milliseconds. Answers the renderer's name, or "" when
// WebGL cannot run here (the page then checks on the main thread, or keeps the static image).
self.onmessage = () => {
  let name = "";
  try {
    const canvas = new OffscreenCanvas(1, 1);
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (gl) {
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      name = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      const lose = gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
    }
  } catch {
    name = "";
  }
  self.postMessage(name);
};
