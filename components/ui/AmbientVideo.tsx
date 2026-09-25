"use client";

import { useEffect, useRef, useState } from "react";
import { srcSet, videoSourcesFor, type ResolvedVideo } from "@/lib/media-shared";

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
 * With "reduce motion" or data saving on, only its poster frame is shown until the visitor
 * presses play; a button pauses and resumes it at any time (WCAG 2.2.2).
 */
export function AmbientVideo({ video, label, pauseLabel, playLabel, className, priority }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const { small, large } = videoSourcesFor(video);

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
    observer.observe(el);
    return () => observer.disconnect();
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
        preload={priority ? "auto" : "metadata"}
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
        {large !== small ? (
          <source src={large.src} type="video/mp4" media="(min-width: 1100px)" />
        ) : null}
        <source src={small.src} type="video/mp4" />
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
