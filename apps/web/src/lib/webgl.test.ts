import { afterEach, describe, expect, it, vi } from "vitest";
import { PROBE_TIMEOUT_MS, realGpu } from "./webgl";

/** A WebGL context on the main thread that names this renderer (null: no WebGL at all). */
function mainThreadRenderer(name: string | null) {
  const gl = name === null ? null : { RENDERER: 1, getExtension: () => null, getParameter: () => name };
  vi.stubGlobal("document", { createElement: () => ({ getContext: () => gl }) });
}

/** A worker that answers `answer` (undefined: never answers; "error": fails to load). */
function worker(answer: string | undefined) {
  const made: { terminated: boolean }[] = [];
  class FakeWorker {
    onmessage: ((event: { data: string }) => void) | null = null;
    onerror: (() => void) | null = null;
    terminated = false;
    constructor(public url: string) {
      made.push(this);
    }
    postMessage() {
      if (answer === "error") queueMicrotask(() => this.onerror?.());
      else if (answer !== undefined) queueMicrotask(() => this.onmessage?.({ data: answer }));
    }
    terminate() {
      this.terminated = true;
    }
  }
  vi.stubGlobal("Worker", FakeWorker);
  vi.stubGlobal("OffscreenCanvas", class {});
  return made;
}

describe("the GPU check of the 3D scenes, off the main thread (§9.4)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("asks the worker and ends it", async () => {
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    const made = worker("ANGLE (Apple, Apple M2, OpenGL 4.1)");
    expect(await realGpu()).toBe(true);
    expect(made[0]?.terminated).toBe(true);
    worker("SwiftShader Device (Subzero)");
    expect(await realGpu()).toBe(false); // software WebGL: the still image stays
  });

  it("checks on the main thread where the worker cannot", async () => {
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    worker(""); // no WebGL in a worker here
    mainThreadRenderer("Adreno (TM) 740");
    expect(await realGpu()).toBe(true);
    worker("error");
    mainThreadRenderer(null);
    expect(await realGpu()).toBe(false);
  });

  it("without workers, checks on the main thread", async () => {
    mainThreadRenderer("llvmpipe (LLVM 15.0.7, 256 bits)");
    expect(await realGpu()).toBe(false);
  });

  it("gives up when the worker does not answer", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    const made = worker(undefined);
    const answer = realGpu();
    vi.advanceTimersByTime(PROBE_TIMEOUT_MS);
    expect(await answer).toBe(false);
    expect(made[0]?.terminated).toBe(true);
  });
});
