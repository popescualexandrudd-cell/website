"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CourtEngine, LabSnapshot, Mode } from "./engine";
import { webglSupport, whenSettled } from "./support";

type Status = "poster" | "loading" | "live" | "unavailable";

type Props = {
  mode: Mode;
  className?: string;
  poster: ReactNode;
  /** Shown to screen readers; the canvas itself is decorative. */
  label: string;
  onEngine?: (engine: CourtEngine | null) => void;
  onLab?: (snapshot: LabSnapshot) => void;
  onStatus?: (status: Status) => void;
};

/**
 * A 3D viewport. The page renders the poster; the engine (three.js, loaded as a separate
 * chunk) arrives only after the page has loaded, when the viewport is near the screen and the
 * device supports WebGL 2. Nothing is downloaded otherwise.
 */
export function Court3D({ mode, className = "", poster, label, onEngine, onLab, onStatus }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("poster");
  const callbacks = useRef({ onEngine, onLab, onStatus });
  useEffect(() => {
    callbacks.current = { onEngine, onLab, onStatus };
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let unregister: (() => void) | null = null;
    const update = (next: Status) => {
      if (cancelled) return;
      setStatus(next);
      callbacks.current.onStatus?.(next);
    };

    const start = async () => {
      const support = webglSupport();
      if (!support.ok) {
        update("unavailable");
        return;
      }
      await whenSettled();
      if (cancelled) return;
      update("loading");
      try {
        const { getEngine } = await import("./engine");
        const engine = await getEngine({
          detail: support.detail,
          reducedMotion: support.reducedMotion,
        });
        if (cancelled) return;
        engine.onLost = () => update("unavailable");
        unregister = engine.register(host, {
          mode,
          onReady: () => update("live"),
          onLab: (snapshot) => callbacks.current.onLab?.(snapshot),
        });
        callbacks.current.onEngine?.(engine);
      } catch {
        update("unavailable");
      }
    };

    // Wait until the viewport is within a screen of being visible.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          void start();
        }
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(host);
    return () => {
      cancelled = true;
      observer.disconnect();
      unregister?.();
      callbacks.current.onEngine?.(null);
    };
  }, [mode]);

  return (
    <div className={`court3d ${className}`} data-status={status} role="img" aria-label={label}>
      <div className="court3d-poster">{poster}</div>
      <div ref={hostRef} className="court3d-host" />
    </div>
  );
}
