"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";

const MAX = 10; // degrees

/** A card that tilts in 3D towards the pointer, with a moving glare. */
export function Tilt({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const enabled = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !enabled()) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.dataset.active = "true";
    el.style.setProperty("--ry", `${(px - 0.5) * 2 * MAX}deg`);
    el.style.setProperty("--rx", `${(0.5 - py) * 2 * MAX}deg`);
    el.style.setProperty("--gx", `${px * 100}%`);
    el.style.setProperty("--gy", `${py * 100}%`);
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.dataset.active = "false";
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };
  return (
    <div ref={ref} className="tilt" onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
    </div>
  );
}
