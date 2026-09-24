"use client";

import { useEffect } from "react";
import type { SceneConfig } from "./cinematic";

export const CINEMATIC_QUERY = "(min-width: 768px) and (prefers-reduced-motion: no-preference)";

/**
 * Starts the cinematic choreography only where it belongs (large screens, motion allowed).
 * GSAP, ScrollTrigger, SplitText, Lenis and the shader are loaded on demand, so phones and
 * reduced-motion visitors never download them. Switching the preference live tears it down.
 */
export function HomeDirector({ scenes }: { scenes: SceneConfig[] }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-home]");
    if (!root) return;
    const query = window.matchMedia(CINEMATIC_QUERY);
    let stop: (() => void) | null = null;
    let generation = 0;

    const start = async () => {
      const current = ++generation;
      if (!query.matches) return;
      const { startCinematic } = await import("./cinematic");
      if (current !== generation || !query.matches) return;
      stop = startCinematic(root, scenes);
    };
    const onChange = () => {
      stop?.();
      stop = null;
      void start();
    };

    void start();
    query.addEventListener("change", onChange);
    return () => {
      generation += 1;
      query.removeEventListener("change", onChange);
      stop?.();
      stop = null;
    };
  }, [scenes]);
  return null;
}
