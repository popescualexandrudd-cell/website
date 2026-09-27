"use client";

import { useEffect, useRef } from "react";

/** The line of the ecosystem timeline fills as the visitor scrolls through the steps (static under reduced motion). */
export function TimelineProgress() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    const list = el?.parentElement;
    if (!el || !list || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = list.getBoundingClientRect();
      const mid = window.innerHeight * 0.6;
      const progress = Math.max(0, Math.min(1, (mid - rect.top) / rect.height));
      el.style.setProperty("--progress", progress.toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return <span ref={ref} className="timeline-progress" aria-hidden="true" />;
}
