/**
 * Halftone ball for scene 3: a grid of gold dots whose radius grows with scroll progress until
 * they merge into a solid ball. Hand-written WebGL (no library), one full-screen triangle.
 * Draws only when asked (the director calls `render` while the scene is on screen), with the
 * device pixel ratio capped at 2. Returns null when WebGL is unavailable; the caller then uses
 * the CSS fallback.
 */

const VERTEX = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT = `
precision mediump float;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uProgress;
uniform float uCell;
uniform float uOpacity;

vec3 gold(float t) {
  vec3 light = vec3(0.957, 0.863, 0.541);
  vec3 mid = vec3(0.788, 0.631, 0.231);
  vec3 dark = vec3(0.431, 0.322, 0.078);
  return t < 0.5 ? mix(light, mid, t * 2.0) : mix(mid, dark, (t - 0.5) * 2.0);
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 cell = floor(frag / uCell);
  vec2 cellCenter = (cell + 0.5) * uCell;
  vec2 rel = (cellCenter - uCenter) / uRadius;
  float dist = length(rel);
  // Shading: lighter towards the upper left, like the painted ball.
  float shade = clamp(length(rel - vec2(-0.35, -0.4)) / 1.6, 0.0, 1.0);
  float inside = 1.0 - smoothstep(0.88, 1.02, dist);
  // Dots appear first near the centre, then spread outwards.
  float reveal = smoothstep(dist * 0.55, dist * 0.55 + 0.45, uProgress * 1.2);
  float dotRadius = uCell * 0.5 * inside * reveal * mix(0.25, 1.45, uProgress) * (1.15 - shade * 0.35);
  float d = length(frag - cellCenter);
  float alpha = (1.0 - smoothstep(dotRadius - 1.0, dotRadius + 0.6, d)) * inside;
  // Near the end the grid dissolves into the continuous ball.
  float solid = smoothstep(0.82, 1.0, uProgress) * (1.0 - smoothstep(0.96, 1.0, dist));
  float a = max(alpha, solid) * uOpacity;
  vec3 color = gold(clamp(length(frag - uCenter + vec2(uRadius * 0.35, uRadius * 0.4)) / (uRadius * 1.9), 0.0, 1.0));
  gl_FragColor = vec4(color * a, a);
}`;

export type Halftone = {
  render: (options: {
    x: number;
    y: number;
    radius: number;
    progress: number;
    opacity: number;
  }) => void;
  resize: () => void;
  clear: () => void;
  destroy: () => void;
};

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createHalftone(canvas: HTMLCanvasElement): Halftone | null {
  const gl = canvas.getContext("webgl", {
    premultipliedAlpha: true,
    alpha: true,
    antialias: false,
  });
  if (!gl) return null;
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const u = {
    resolution: gl.getUniformLocation(program, "uResolution"),
    center: gl.getUniformLocation(program, "uCenter"),
    radius: gl.getUniformLocation(program, "uRadius"),
    progress: gl.getUniformLocation(program, "uProgress"),
    cell: gl.getUniformLocation(program, "uCell"),
    opacity: gl.getUniformLocation(program, "uOpacity"),
  };
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  let dpr = 1;
  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.round(canvas.clientWidth * dpr);
    const height = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();

  return {
    render({ x, y, radius, progress, opacity }) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (opacity <= 0.001) return;
      gl.uniform2f(u.resolution, canvas.width, canvas.height);
      gl.uniform2f(u.center, x * dpr, y * dpr);
      gl.uniform1f(u.radius, Math.max(1, radius * dpr));
      gl.uniform1f(u.progress, progress);
      gl.uniform1f(u.cell, Math.max(6, Math.round(radius * dpr * 0.16)));
      gl.uniform1f(u.opacity, opacity);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    resize,
    clear() {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    },
    destroy() {
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
