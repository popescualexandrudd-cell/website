"use client";

import { useEffect, useRef, useState } from "react";
import { srcSet, type ResolvedVideo } from "@/lib/media-shared";

type Props = {
  video: ResolvedVideo;
  /** Describes what the video shows (it has no sound and no captions to read). */
  label: string;
  pauseLabel: string;
  playLabel: string;
  className?: string;
  /** Load the poster before anything else (the opening of the home page). */
  priority?: boolean;
};

/**
 * A silent, looping video of the club: plays while it is on screen and stops when it leaves.
 * The poster frame paints first; the video itself starts downloading only once the page has
 * loaded, so it never delays the text, the fonts or the first image. Phones get the lightest
 * encoding. With "reduce motion" or data saving on, only the poster is shown until the visitor
 * presses play; a button pauses and resumes it at any time (WCAG 2.2.2).
 */
export function AmbientVideo({ video, label, pauseLabel, playLabel, className, priority }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  // Largest first: the browser takes the first source whose media query matches.
  const sources = [...video.sources].sort((a, b) => b.w - a.w);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData =
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData ===
      true;
    if (reduce || saveData || userPaused) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void el.play().catch(() => undefined);
        else el.pause();
      },
      { threshold: 0.15 },
    );
    // After the page's own resources, and when the browser is idle.
    let idle = 0;
    const start = () => {
      const run = () => observer.observe(el);
      idle =
        typeof window.requestIdleCallback === "function"
          ? window.requestIdleCallback(run, { timeout: 2000 })
          : window.setTimeout(run, 300);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
      window.clearTimeout(idle);
      observer.disconnect();
    };
  }, [userPaused]);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      setUserPaused(false);
      void el.play().catch(() => undefined);
    } else {
      setUserPaused(true);
      el.pause();
    }
  };

  const poster = video.poster;
  return (
    <div className={`ambient-video ${className ?? ""}`}>
      {priority && poster ? (
        <link
          rel="preload"
          as="image"
          type="image/avif"
          imageSrcSet={srcSet(poster.avif)}
          imageSizes="100vw"
          fetchPriority="high"
        />
      ) : null}
      <video
        ref={ref}
        className="ambient-video-el"
        muted
        loop
        playsInline
        preload="none"
        poster={poster?.fallback}
        aria-label={label || undefined}
        aria-hidden={label ? undefined : true}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        style={
          poster
            ? {
                backgroundImage: `url("${poster.blurDataURL}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        {sources.map((source, i) => (
          <source
            key={source.src}
            src={source.src}
            type="video/mp4"
            // 1920 wide from 1056 px screens, 1280 from 704 px, the smallest below.
            media={
              i < sources.length - 1 ? `(min-width: ${Math.round(source.w * 0.55)}px)` : undefined
            }
          />
        ))}
      </video>
      <button
        type="button"
        className="ambient-video-toggle"
        onClick={toggle}
        aria-label={playing ? pauseLabel : playLabel}
        data-playing={playing}
      >
        <span aria-hidden="true" className="ambient-video-icon" />
      </button>
    </div>
  );
}
